import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { fetchUserProfile, verifyAdminStatus } from '../lib/portalApi';
import type { AdminRole, ProfileRecord } from '../types/database';

export interface AuthSessionResolution {
  user: User | null;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  roleRpcMissing: boolean;
  adminCheckError: string | null;
  adminRpcMissing: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRecord | null;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  roleRpcMissing: boolean;
  adminCheckError: string | null;
  adminRpcMissing: boolean;
  loading: boolean;
  isConfigured: boolean;
  recoveryMode: boolean;
  clearRecoveryMode: () => void;
  sessionExpiredNotice: string | null;
  clearSessionExpiredNotice: () => void;
  refreshSessionData: () => Promise<AuthSessionResolution>;
  signOut: () => Promise<void>;
}

const EMPTY_RESOLUTION: AuthSessionResolution = {
  user: null,
  isAdmin: false,
  adminRole: null,
  roleRpcMissing: false,
  adminCheckError: null,
  adminRpcMissing: false,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [roleRpcMissing, setRoleRpcMissing] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const [adminRpcMissing, setAdminRpcMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);
  const deferredSyncTimerRef = useRef<number | null>(null);

  const clearAuthState = useCallback(() => {
    currentUserIdRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setAdminRole(null);
    setRoleRpcMissing(false);
    setAdminCheckError(null);
    setAdminRpcMissing(false);
  }, []);

  const resolveSession = useCallback(
    async (
      targetSession: Session | null,
      options?: { silent?: boolean }
    ): Promise<AuthSessionResolution> => {
      const seq = ++requestSeqRef.current;

      if (!targetSession?.user) {
        if (mountedRef.current) {
          clearAuthState();
          setLoading(false);
        }
        return EMPTY_RESOLUTION;
      }

      const currentUser = targetSession.user;
      currentUserIdRef.current = currentUser.id;

      if (!options?.silent && mountedRef.current) {
        setLoading(true);
      }

      const [profileRes, adminRes] = await Promise.all([
        fetchUserProfile(currentUser.id),
        verifyAdminStatus(),
      ]);

      const resolution: AuthSessionResolution = {
        user: currentUser,
        isAdmin: adminRes.isAdmin,
        adminRole: adminRes.adminRole,
        roleRpcMissing: adminRes.roleRpcMissing,
        adminCheckError: adminRes.error,
        adminRpcMissing: adminRes.rpcMissing,
      };

      if (!mountedRef.current || seq !== requestSeqRef.current) {
        return resolution;
      }

      setSession(targetSession);
      setUser(currentUser);
      setProfile(profileRes.data ?? null);
      setIsAdmin(adminRes.isAdmin);
      setAdminRole(adminRes.adminRole);
      setRoleRpcMissing(adminRes.roleRpcMissing);
      setAdminCheckError(adminRes.error);
      setAdminRpcMissing(adminRes.rpcMissing);
      setLoading(false);

      return resolution;
    },
    [clearAuthState]
  );

  const refreshSessionData = useCallback(async (): Promise<AuthSessionResolution> => {
    if (deferredSyncTimerRef.current !== null) {
      window.clearTimeout(deferredSyncTimerRef.current);
      deferredSyncTimerRef.current = null;
    }

    if (!supabase) {
      clearAuthState();
      setLoading(false);
      return EMPTY_RESOLUTION;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      requestSeqRef.current += 1;
      clearAuthState();
      setLoading(false);
      return EMPTY_RESOLUTION;
    }

    return resolveSession(data.session);
  }, [clearAuthState, resolveSession]);

  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    if (hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery') {
      setRecoveryMode(true);
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mountedRef.current) return;
      if (error || !data.session) {
        clearAuthState();
        setLoading(false);
        return;
      }
      await resolveSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return;

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }

      if (event === 'SIGNED_OUT') {
        if (deferredSyncTimerRef.current !== null) {
          window.clearTimeout(deferredSyncTimerRef.current);
          deferredSyncTimerRef.current = null;
        }
        requestSeqRef.current += 1;
        clearAuthState();
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && !nextSession) {
        if (deferredSyncTimerRef.current !== null) {
          window.clearTimeout(deferredSyncTimerRef.current);
          deferredSyncTimerRef.current = null;
        }
        requestSeqRef.current += 1;
        setSessionExpiredNotice('Your authenticated session has expired. Please sign in again.');
        clearAuthState();
        setLoading(false);
        return;
      }

      const nextUserId = nextSession?.user?.id ?? null;
      const userChanged = nextUserId !== currentUserIdRef.current;

      if (userChanged) {
        currentUserIdRef.current = nextUserId;
        if (nextUserId) {
          setLoading(true);
        }
        if (deferredSyncTimerRef.current !== null) {
          window.clearTimeout(deferredSyncTimerRef.current);
        }
        // Defer RPC/table queries outside GoTrue's synchronous auth event dispatch
        deferredSyncTimerRef.current = window.setTimeout(() => {
          deferredSyncTimerRef.current = null;
          void resolveSession(nextSession ?? null);
        }, 0);
      } else if (nextSession) {
        setSession(nextSession);
        if (event === 'USER_UPDATED') {
          if (deferredSyncTimerRef.current !== null) {
            window.clearTimeout(deferredSyncTimerRef.current);
          }
          deferredSyncTimerRef.current = window.setTimeout(() => {
            deferredSyncTimerRef.current = null;
            void resolveSession(nextSession, { silent: true });
          }, 0);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
        deferredSyncTimerRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [clearAuthState, resolveSession]);

  const signOut = useCallback(async () => {
    if (deferredSyncTimerRef.current !== null) {
      window.clearTimeout(deferredSyncTimerRef.current);
      deferredSyncTimerRef.current = null;
    }
    requestSeqRef.current += 1;
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearAuthState();
    setRecoveryMode(false);
    setLoading(false);
  }, [clearAuthState]);

  const clearRecoveryMode = useCallback(() => setRecoveryMode(false), []);
  const clearSessionExpiredNotice = useCallback(() => setSessionExpiredNotice(null), []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isAdmin,
        adminRole,
        roleRpcMissing,
        adminCheckError,
        adminRpcMissing,
        loading,
        isConfigured: isSupabaseConfigured,
        recoveryMode,
        clearRecoveryMode,
        sessionExpiredNotice,
        clearSessionExpiredNotice,
        refreshSessionData,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { AlertBanner, StatusTag } from '../ui/StateDisplay';
import { formatDateTime } from '../../lib/formatters';
import { supabase } from '../../lib/supabase';

interface MfaFactorItem {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

export function ClientSecurityModule({
  user,
  clientEmail,
  isAdmin,
  onOpenSupport,
  onSignOut,
}: {
  user: User;
  clientEmail: string;
  isAdmin: boolean;
  onOpenSupport: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{
    tone: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // TOTP MFA state
  const [mfaFactors, setMfaFactors] = useState<MfaFactorItem[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [enrollingFactor, setEnrollingFactor] = useState<{
    id: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [globalSigningOut, setGlobalSigningOut] = useState(false);

  const loadFactors = useCallback(async () => {
    if (!supabase) return;
    setMfaLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    setMfaLoading(false);
    if (!error && data?.totp) {
      setMfaFactors(
        data.totp.map((f) => ({
          id: f.id,
          friendly_name: f.friendly_name,
          factor_type: f.factor_type,
          status: f.status,
        }))
      );
    }
  }, []);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSecurityFeedback(null);
    if (!supabase) return;
    if (newPassword.length < 8) {
      setSecurityFeedback({ tone: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setSecurityFeedback({ tone: 'error', message: 'Password confirmation does not match.' });
      return;
    }

    setPasswordUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordUpdating(false);

    if (error) {
      setSecurityFeedback({
        tone: 'error',
        message: error.message || 'Unable to update password right now.',
      });
      return;
    }
    setNewPassword('');
    setConfirmNewPassword('');
    setSecurityFeedback({ tone: 'success', message: 'Your password has been updated securely.' });
  }

  async function handleSendResetEmail() {
    if (!supabase || !clientEmail) return;
    setSecurityFeedback(null);
    setResetEmailSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(clientEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetEmailSending(false);
    if (error) {
      setSecurityFeedback({
        tone: 'error',
        message: 'Unable to send password recovery link right now.',
      });
      return;
    }
    setSecurityFeedback({
      tone: 'success',
      message: `Password recovery link sent to ${clientEmail}.`,
    });
  }

  async function handleStartMfaEnroll() {
    if (!supabase) return;
    setSecurityFeedback(null);
    setMfaBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Northbridge Authenticator App',
    });
    setMfaBusy(false);

    if (error || !data) {
      setSecurityFeedback({
        tone: 'error',
        message:
          error?.message ||
          'Two-factor enrollment is unavailable. Ensure MFA/TOTP is enabled in your Supabase Auth settings.',
      });
      return;
    }

    setEnrollingFactor({
      id: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function handleVerifyMfaEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !enrollingFactor) return;
    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollingFactor.id,
      code: mfaCode.trim(),
    });
    setMfaBusy(false);

    if (error) {
      setSecurityFeedback({
        tone: 'error',
        message: error.message || 'Invalid 6-digit authenticator code.',
      });
      return;
    }

    setEnrollingFactor(null);
    setMfaCode('');
    setSecurityFeedback({
      tone: 'success',
      message: 'Two-factor authentication (TOTP) is now active on your account.',
    });
    await loadFactors();
  }

  async function handleDisableMfa(factorId: string) {
    if (!supabase) return;
    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaBusy(false);
    if (error) {
      setSecurityFeedback({ tone: 'error', message: error.message || 'Unable to disable factor.' });
      return;
    }
    setSecurityFeedback({ tone: 'info', message: 'Authenticator factor removed.' });
    await loadFactors();
  }

  async function handleRevokeAllSessions() {
    if (!supabase) return;
    setGlobalSigningOut(true);
    await supabase.auth.signOut({ scope: 'global' });
    setGlobalSigningOut(false);
    await onSignOut();
  }

  const verifiedFactors = mfaFactors.filter((f) => f.status === 'verified');

  return (
    <div className="space-y-6">
      {securityFeedback ? (
        <AlertBanner
          tone={securityFeedback.tone}
          message={securityFeedback.message}
          onDismiss={() => setSecurityFeedback(null)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Password Management */}
        <div className="lg:col-span-6 border border-[#E2E8F0] bg-white p-6 space-y-5">
          <div className="border-b border-[#E2E8F0] pb-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
              Credential Security
            </p>
            <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
              Password &amp; Recovery Controls
            </h3>
            <p className="mt-1 text-xs text-[#475569]">
              Passwords are encrypted by Supabase Auth and are never readable by administrators or stored in application tables.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="sec-pw" className="block text-xs font-medium text-[#334155]">
                New Password
              </label>
              <input
                id="sec-pw"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
              />
            </div>
            <div>
              <label htmlFor="sec-pw-confirm" className="block text-xs font-medium text-[#334155]">
                Confirm New Password
              </label>
              <input
                id="sec-pw-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
              />
            </div>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="submit"
                disabled={passwordUpdating}
                className="bg-[#0B1320] px-4 py-2 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
              >
                {passwordUpdating ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                disabled={resetEmailSending}
                onClick={handleSendResetEmail}
                className="border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
              >
                {resetEmailSending ? 'Sending...' : 'Send Recovery Email'}
              </button>
            </div>
          </form>
        </div>

        {/* Two-Factor Authentication */}
        <div className="lg:col-span-6 border border-[#E2E8F0] bg-white p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                Multi-Factor Protection
              </p>
              <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                Two-Factor Authentication (TOTP)
              </h3>
            </div>
            <StatusTag status={verifiedFactors.length > 0 ? 'verified' : 'pending_review'} />
          </div>

          {mfaLoading ? (
            <p className="text-xs text-[#64748B]">Checking enrolled authenticators...</p>
          ) : verifiedFactors.length > 0 ? (
            <div className="space-y-3">
              {verifiedFactors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between gap-3 border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#166534]" />
                    <div>
                      <p className="font-medium text-[#0B1320]">
                        {factor.friendly_name || 'TOTP Authenticator'}
                      </p>
                      <p className="font-mono text-[11px] text-[#64748B]">
                        Factor ID: {factor.id.slice(0, 12)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={mfaBusy}
                    onClick={() => void handleDisableMfa(factor.id)}
                    className="border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-medium text-[#991B1B]"
                  >
                    Disable
                  </button>
                </div>
              ))}
            </div>
          ) : enrollingFactor ? (
            <form onSubmit={handleVerifyMfaEnroll} className="space-y-4">
              <p className="text-xs text-[#334155]">
                Scan the QR code below with Google Authenticator, Authy, or 1Password, then enter the 6-digit verification code.
              </p>
              <div className="flex flex-wrap items-center gap-4 border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <img
                  src={enrollingFactor.qrCode}
                  alt="TOTP QR Code"
                  className="h-28 w-28 border border-[#CBD5E1] bg-white p-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-medium text-[#64748B]">Manual Setup Secret:</p>
                  <p className="font-mono text-xs text-[#0B1320] break-all">{enrollingFactor.secret}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="6-digit code"
                  className="w-40 border border-[#CBD5E1] px-3 py-2 font-mono text-xs text-[#0B1320]"
                />
                <button
                  type="submit"
                  disabled={mfaBusy}
                  className="bg-[#0B1320] px-4 py-2 text-xs font-medium text-white hover:bg-[#18263D]"
                >
                  {mfaBusy ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollingFactor(null)}
                  className="border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-[#475569]">
                Add an authenticator app for second-factor protection on account access and high-trust settings.
              </p>
              <button
                type="button"
                disabled={mfaBusy}
                onClick={handleStartMfaEnroll}
                className="inline-flex items-center gap-2 bg-[#0B1320] px-4 py-2 text-xs font-medium text-white hover:bg-[#18263D]"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>{mfaBusy ? 'Initializing...' : 'Enable Two-Factor Authentication'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Session & Contact Verification History */}
      <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 className="font-serif text-lg text-[#0B1320]">
              Login History, Active Session &amp; Contact Verification
            </h3>
            <p className="text-xs text-[#64748B]">
              Verified authentication telemetry from Supabase Auth.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenSupport}
              className="border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
            >
              Report Security Concern
            </button>
            <button
              type="button"
              disabled={globalSigningOut}
              onClick={handleRevokeAllSessions}
              className="border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2 text-xs font-medium text-[#991B1B] hover:border-[#991B1B]"
            >
              {globalSigningOut ? 'Signing Out...' : 'Sign Out All Devices'}
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <dt className="text-[#64748B]">Verified Contact Email</dt>
            <dd className="mt-1 font-mono text-[#0B1320] break-all">{clientEmail}</dd>
          </div>
          <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <dt className="text-[#64748B]">Email Confirmation</dt>
            <dd className="mt-1">
              <StatusTag status={user.email_confirmed_at ? 'verified' : 'pending_review'} />
            </dd>
          </div>
          <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <dt className="text-[#64748B]">Last Recorded Sign-In</dt>
            <dd className="mt-1 font-mono text-[#0B1320] tabular-nums">
              {formatDateTime(user.last_sign_in_at)}
            </dd>
          </div>
          <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <dt className="text-[#64748B]">Access Role Scope</dt>
            <dd className="mt-1 font-medium text-[#0B1320]">
              {isAdmin ? 'Administrator Verified' : 'Private Client Session'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AlertBanner, SupabaseConfigNotice } from '../components/ui/StateDisplay';
import { useAuth } from '../contexts/AuthContext';
import { isValidEmail } from '../lib/formatters';
import { supabase, supabaseConfigError } from '../lib/supabase';

export function LoginPage() {
  const {
    user,
    isAdmin,
    loading: authLoading,
    isConfigured,
    refreshSessionData,
    sessionExpiredNotice,
    clearSessionExpiredNotice,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const requestedFrom = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (!authLoading && user && !submitting) {
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    }
  }, [authLoading, user, isAdmin, submitting, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setUnconfirmedEmail(null);
    clearSessionExpiredNotice();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (!supabase) {
      setError(
        supabaseConfigError ||
          'Authentication is unavailable until VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured.'
      );
      return;
    }

    setSubmitting(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setSubmitting(false);
      const lower = signInError.message.toLowerCase();
      if (lower.includes('failed to fetch') || lower.includes('network')) {
        setError(
          'Unable to reach the Supabase authentication service. Check VITE_SUPABASE_URL and network connectivity.'
        );
      } else if (lower.includes('email not confirmed')) {
        setUnconfirmedEmail(normalizedEmail);
        setError(
          'Your email address has not yet been verified. Please check your inbox for the confirmation link before signing in.'
        );
      } else if (lower.includes('invalid login credentials')) {
        setError('Invalid email address or password. Please verify your credentials and try again.');
      } else if (lower.includes('too many requests') || lower.includes('rate limit')) {
        setError('Too many sign-in attempts. Please wait a few minutes and try again.');
      } else if (lower.includes('banned') || lower.includes('disabled')) {
        setError('Access for this account is currently restricted. Please contact administration.');
      } else if (lower.includes('invalid api key') || lower.includes('apikey')) {
        setError(
          'Supabase authentication rejected the project key. Verify VITE_SUPABASE_PUBLISHABLE_KEY in your environment configuration.'
        );
      } else {
        setError(
          signInError.message ||
            'Sign-in could not be completed. Please verify your email and password and try again.'
        );
      }
      return;
    }

    if (data.session) {
      const authResult = await refreshSessionData();
      setSubmitting(false);

      if (authResult.isAdmin) {
        navigate('/admin', { replace: true });
      } else if (requestedFrom === '/admin' && authResult.adminCheckError) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    setSubmitting(false);
    setError('Sign-in did not establish an active session. Please try again.');
  }

  async function handleResendVerification() {
    if (!supabase || !unconfirmedEmail) return;
    setResending(true);
    setError(null);
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);

    if (resendErr) {
      setError('Unable to resend verification email right now. Please try again shortly.');
      return;
    }
    setInfoMessage('A fresh verification link has been dispatched to your email address.');
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-lg px-6 py-16 sm:py-24">
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-8 sm:p-10">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Private Client Access
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium text-[#111C2E]">
            Client Login
          </h1>
          <p className="mt-2 text-sm text-[#3E4652]">
            Sign in to view your account status, ledger history, portfolio holdings, and client support threads.
          </p>

          <div className="mt-6 space-y-4">
            {!isConfigured ? <SupabaseConfigNotice /> : null}
            {sessionExpiredNotice ? (
              <AlertBanner
                tone="warning"
                message={sessionExpiredNotice}
                onDismiss={clearSessionExpiredNotice}
              />
            ) : null}
            {error ? <AlertBanner tone="error" message={error} /> : null}
            {infoMessage ? <AlertBanner tone="success" message={infoMessage} /> : null}

            {unconfirmedEmail ? (
              <div className="border border-[#D8D1C4] bg-[#F7F5F0] p-4 flex items-center justify-between gap-4">
                <p className="text-xs text-[#3E4652]">Need a new verification link?</p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-xs font-medium text-[#0B1320] underline underline-offset-4 hover:text-[#8F6F3E] whitespace-nowrap shrink-0"
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-[#111C2E]">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="mt-1.5 w-full border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-medium text-[#111C2E]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#8F6F3E] hover:text-[#0B1320]"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#D8D1C4] bg-white px-3.5 py-2.5 pr-11 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#3E4652] hover:text-[#0B1320]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !isConfigured}
              className="w-full bg-[#0B1320] px-5 py-3 text-sm font-medium text-[#FCFBF8] transition-colors hover:bg-[#18263D] disabled:opacity-50"
            >
              {submitting ? 'Signing In...' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-8 border-t border-[#EAE6DD] pt-6 text-center text-sm text-[#3E4652]">
            New to Northbridge Capital?{' '}
            <Link to="/register" className="font-medium text-[#0B1320] underline underline-offset-4">
              Register for a client portal account
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

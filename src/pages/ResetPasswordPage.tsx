import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AlertBanner, SupabaseConfigNotice } from '../components/ui/StateDisplay';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
  const { session, isAdmin, isConfigured, clearRecoveryMode } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }
    if (!supabase) {
      setError('Supabase client is not configured.');
      return;
    }
    if (!session) {
      setError(
        'No active password recovery session was detected. Please open the password reset link from your email again or request a new link.'
      );
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setSubmitting(false);

    if (updateError) {
      setError('Unable to update your password. The recovery link may have expired—please request a fresh link.');
      return;
    }

    clearRecoveryMode();
    setUpdated(true);
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-lg px-6 py-16 sm:py-24">
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-8 sm:p-10">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Security Update
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium text-[#111C2E]">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-[#3E4652]">
            Establish a new password for your Northbridge Capital portal account.
          </p>

          <div className="mt-6 space-y-4">
            {!isConfigured ? <SupabaseConfigNotice /> : null}
            {!session && !updated ? (
              <AlertBanner
                tone="warning"
                title="Recovery Session Required"
                message="Please access this page directly from the password reset link sent to your email address."
              />
            ) : null}
            {error ? <AlertBanner tone="error" message={error} /> : null}
            {updated ? (
              <AlertBanner
                tone="success"
                title="Password Updated"
                message="Your account password has been updated securely."
              />
            ) : null}
          </div>

          {!updated ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              <div>
                <label htmlFor="reset-password" className="block text-xs font-medium text-[#111C2E]">
                  New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full border border-[#D8D1C4] bg-white px-3.5 py-2.5 pr-11 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#3E4652]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm" className="block text-xs font-medium text-[#111C2E]">
                  Confirm New Password
                </label>
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1.5 w-full border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !session || !isConfigured}
                className="w-full bg-[#0B1320] px-5 py-3 text-sm font-medium text-[#FCFBF8] transition-colors hover:bg-[#18263D] disabled:opacity-50"
              >
                {submitting ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
                className="w-full bg-[#0B1320] px-5 py-3 text-sm font-medium text-[#FCFBF8] hover:bg-[#18263D]"
              >
                {isAdmin ? 'Proceed to Admin Console' : 'Proceed to Client Dashboard'}
              </button>
              <Link
                to="/login"
                className="text-center text-xs font-medium text-[#3E4652] underline underline-offset-4"
              >
                Return to Client Login
              </Link>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AlertBanner, SupabaseConfigNotice } from '../components/ui/StateDisplay';
import { useAuth } from '../contexts/AuthContext';
import { isValidEmail } from '../lib/formatters';
import { supabase, supabaseConfigError } from '../lib/supabase';

export function ForgotPasswordPage() {
  const { isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!supabase) {
      setError(
        supabaseConfigError ||
          'Password recovery is unavailable until VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured.'
      );
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );
    setSubmitting(false);

    if (resetError) {
      setError('Unable to send password recovery instructions right now. Please try again shortly.');
      return;
    }

    setSent(true);
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-lg px-6 py-16 sm:py-24">
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-8 sm:p-10">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Account Recovery
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium text-[#111C2E]">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-[#3E4652]">
            Enter the email address associated with your Northbridge Capital account to receive a password reset link.
          </p>

          <div className="mt-6 space-y-4">
            {!isConfigured ? <SupabaseConfigNotice /> : null}
            {error ? <AlertBanner tone="error" message={error} /> : null}
            {sent ? (
              <AlertBanner
                tone="success"
                title="Recovery Email Dispatched"
                message="If an account matches the email address provided, password reset instructions have been sent. Please follow the link in your email to establish a new password."
              />
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-medium text-[#111C2E]">
                Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="mt-1.5 w-full border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !isConfigured}
              className="w-full bg-[#0B1320] px-5 py-3 text-sm font-medium text-[#FCFBF8] transition-colors hover:bg-[#18263D] disabled:opacity-50"
            >
              {submitting ? 'Sending Instructions...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-8 border-t border-[#EAE6DD] pt-6 text-center text-sm text-[#3E4652]">
            Remembered your credentials?{' '}
            <Link to="/login" className="font-medium text-[#0B1320] underline underline-offset-4">
              Return to Client Login
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

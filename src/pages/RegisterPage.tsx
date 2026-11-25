import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AlertBanner, SupabaseConfigNotice } from '../components/ui/StateDisplay';
import { useAuth } from '../contexts/AuthContext';
import { isValidEmail } from '../lib/formatters';
import { supabase, supabaseConfigError } from '../lib/supabase';

export function RegisterPage() {
  const { user, isAdmin, loading: authLoading, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDuplicateNotice(false);
    setSuccessMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your confirmation password.');
      return;
    }
    if (!agreedTerms) {
      setError('You must confirm agreement to the Privacy Policy and Terms of Service.');
      return;
    }
    if (!supabase) {
      setError(
        supabaseConfigError ||
          'Registration is unavailable until VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured.'
      );
      return;
    }

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setSubmitting(false);

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes('failed to fetch') || msg.includes('network')) {
        setError('Unable to reach the Supabase project. Check VITE_SUPABASE_URL and network connectivity.');
      } else if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        setDuplicateNotice(true);
        setError('An account with this email address is already registered. Please sign in or reset your password.');
      } else if (msg.includes('email') && (msg.includes('send') || msg.includes('smtp') || msg.includes('rate limit'))) {
        setError(
          'Your account could not complete verification email delivery right now. Please verify email configuration or try again shortly.'
        );
      } else if (msg.includes('database error') || msg.includes('saving new user')) {
        setError(
          'Account provisioning encountered a database schema or trigger error. Ensure handle_new_user() and required tables are configured in your Supabase project.'
        );
      } else if (msg.includes('password')) {
        setError('Please choose a stronger password that meets security requirements.');
      } else {
        setError('Registration could not be completed at this moment. Please review your details and try again.');
      }
      return;
    }

    // Supabase v2 returns an empty identities array when email confirmation is enabled and the email already exists
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setDuplicateNotice(true);
      setError('An account with this email address is already registered. Please sign in or use Forgot Password.');
      return;
    }

    if (data.session) {
      navigate('/dashboard', { replace: true });
      return;
    }

    setSuccessMessage(
      'Your registration has been received. Please check your email to verify your account before signing in.'
    );
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-xl px-6 py-16 sm:py-20">
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-8 sm:p-10">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Client Portal Onboarding
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium text-[#111C2E]">
            Client Registration
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">
            Create an authenticated client portal profile. Email verification is required prior to sign-in. Portal registration establishes digital access only and does not automatically approve an account for regulated financial services.
          </p>

          <div className="mt-6 space-y-4">
            {!isConfigured ? <SupabaseConfigNotice /> : null}
            {error ? <AlertBanner tone="error" message={error} /> : null}
            {duplicateNotice ? (
              <div className="flex flex-wrap gap-4 text-xs font-medium text-[#0B1320]">
                <Link to="/login" className="underline underline-offset-4">
                  Proceed to Client Login
                </Link>
                <Link to="/forgot-password" className="underline underline-offset-4">
                  Reset Password
                </Link>
              </div>
            ) : null}
            {successMessage ? (
              <AlertBanner
                tone="success"
                title="Verification Email Dispatched"
                message={successMessage}
              />
            ) : null}
          </div>

          {!successMessage ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-[#111C2E]">
                  Full Name <span className="text-[#991B1B]">*</span>
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alistair Kensington"
                  className="mt-1.5 w-full border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-medium text-[#111C2E]">
                  Email Address <span className="text-[#991B1B]">*</span>
                </label>
                <input
                  id="reg-email"
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
                <label htmlFor="reg-password" className="block text-xs font-medium text-[#111C2E]">
                  Password <span className="text-[#991B1B]">*</span>
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#3E4652] hover:text-[#0B1320]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-xs font-medium text-[#111C2E]">
                  Confirm Password <span className="text-[#991B1B]">*</span>
                </label>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1.5 w-full border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
                />
              </div>

              <div className="flex items-start gap-3 pt-1">
                <input
                  id="reg-terms"
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#0B1320]"
                />
                <label htmlFor="reg-terms" className="text-xs leading-relaxed text-[#3E4652]">
                  I have read and agree to the Northbridge Capital{' '}
                  <Link to="/privacy" className="font-medium text-[#0B1320] underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  ,{' '}
                  <Link to="/terms" className="font-medium text-[#0B1320] underline underline-offset-2">
                    Terms of Service
                  </Link>
                  , and{' '}
                  <Link to="/risk-disclosure" className="font-medium text-[#0B1320] underline underline-offset-2">
                    Investment Risk Disclosure
                  </Link>
                  .
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !isConfigured}
                className="w-full bg-[#0B1320] px-5 py-3 text-sm font-medium text-[#FCFBF8] transition-colors hover:bg-[#18263D] disabled:opacity-50"
              >
                {submitting ? 'Creating Account...' : 'Register Client Account'}
              </button>
            </form>
          ) : (
            <div className="mt-6">
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center bg-[#0B1320] px-5 py-3 text-sm font-medium text-[#FCFBF8] hover:bg-[#18263D]"
              >
                Return to Client Login
              </Link>
            </div>
          )}

          <div className="mt-8 border-t border-[#EAE6DD] pt-6 text-center text-sm text-[#3E4652]">
            Already verified?{' '}
            <Link to="/login" className="font-medium text-[#0B1320] underline underline-offset-4">
              Sign in here
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

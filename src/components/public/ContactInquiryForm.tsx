import React, { useState } from 'react';
import { isValidEmail } from '../../lib/formatters';
import { submitLeadInquiry } from '../../lib/portalApi';
import { isSupabaseConfigured, supabaseConfigError } from '../../lib/supabase';
import { AlertBanner } from '../ui/StateDisplay';

export function ContactInquiryForm({ source = 'website_contact' }: { source?: string }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Private Client Services Inquiry');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitted(false);

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please provide a brief summary of your inquiry (at least 10 characters).');
      return;
    }

    if (!isSupabaseConfigured) {
      setError(
        supabaseConfigError ||
          'Inquiry submission requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to be configured.'
      );
      return;
    }

    setSubmitting(true);
    const res = await submitLeadInquiry({
      full_name: fullName,
      email,
      phone: null,
      subject,
      message,
      source,
    });
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setSubmitted(true);
    setFullName('');
    setEmail('');
    setMessage('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <AlertBanner tone="error" message={error} onDismiss={() => setError(null)} /> : null}
      {submitted ? (
        <AlertBanner
          tone="success"
          title="Inquiry Recorded"
          message="Thank you. Your correspondence has been received by our London and Zurich client desk. A representative will respond using the email address provided."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${source}-name`} className="block text-xs font-medium text-[#111C2E]">
            Full Name <span className="text-[#991B1B]">*</span>
          </label>
          <input
            id={`${source}-name`}
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Alistair Kensington"
            className="mt-1.5 w-full border border-[#D8D1C4] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#111C2E] placeholder:text-[#3E4652]/50 focus:border-[#0B1320] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor={`${source}-email`} className="block text-xs font-medium text-[#111C2E]">
            Email Address <span className="text-[#991B1B]">*</span>
          </label>
          <input
            id={`${source}-email`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@institution.com"
            className="mt-1.5 w-full border border-[#D8D1C4] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#111C2E] placeholder:text-[#3E4652]/50 focus:border-[#0B1320] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${source}-subject`} className="block text-xs font-medium text-[#111C2E]">
          Topic
        </label>
        <select
          id={`${source}-subject`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1.5 w-full border border-[#D8D1C4] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
        >
          <option value="Private Client Services Inquiry">Private Client Services Inquiry</option>
          <option value="Portfolio Reporting & Onboarding">Portfolio Reporting &amp; Onboarding</option>
          <option value="Institutional Documentation Request">Institutional Documentation Request</option>
          <option value="General Correspondence">General Correspondence</option>
        </select>
      </div>

      <div>
        <label htmlFor={`${source}-message`} className="block text-xs font-medium text-[#111C2E]">
          Message <span className="text-[#991B1B]">*</span>
        </label>
        <textarea
          id={`${source}-message`}
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please outline how our private-client desk can assist you."
          className="mt-1.5 w-full border border-[#D8D1C4] bg-[#FCFBF8] px-3.5 py-2.5 text-sm text-[#111C2E] placeholder:text-[#3E4652]/50 focus:border-[#0B1320] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#3E4652]">
          Submitted inquiries are logged securely for private-client correspondence.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center bg-[#0B1320] px-6 py-3 text-sm font-medium text-[#FCFBF8] transition-colors hover:bg-[#18263D] disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          {submitting ? 'Sending Inquiry...' : 'Submit Inquiry'}
        </button>
      </div>
    </form>
  );
}

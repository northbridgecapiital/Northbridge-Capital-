import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';

export function TermsOfServicePage() {
  return (
    <PublicLayout>
      <section className="border-b border-[#D8D1C4] bg-[#FCFBF8] py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Portal Governance · Effective November 2026
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#111C2E]">
            Terms of Service
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#3E4652]">
            These Terms govern your access to and use of the Northbridge Capital website and private-client digital portal.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-20 space-y-10 text-sm leading-relaxed text-[#3E4652] sm:text-base">
        <div>
          <h2 className="font-serif text-2xl text-[#111C2E]">1. Informational Scope</h2>
          <p className="mt-3">
            The Northbridge Capital platform provides structured financial information, portfolio reporting views, ledger history, and administrative request tools. Portal registration does not establish a fiduciary advisory mandate or automatically qualify an applicant for regulated investment services.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-[#111C2E]">2. Account Registration &amp; Verification</h2>
          <p className="mt-3">
            Users must provide accurate identity details upon registration and complete email verification before signing in. You are responsible for maintaining the confidentiality of your login credentials and notifying Northbridge Capital promptly of any suspected unauthorised access.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-[#111C2E]">3. Administrative Requests</h2>
          <p className="mt-3">
            Financial requests submitted through the portal are formal review inquiries only. They do not constitute completed deposits, withdrawals, or payment instructions. Northbridge Capital reserves the right to request additional documentation or decline any administrative request in accordance with internal governance standards.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-[#111C2E]">4. Risk Acknowledgement</h2>
          <p className="mt-3">
            All users acknowledge the considerations outlined in our{' '}
            <Link to="/risk-disclosure" className="text-[#0B1320] underline underline-offset-4">
              Investment Risk Disclosure
            </Link>
            , including the absence of any guaranteed financial returns.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}

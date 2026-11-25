import { PublicLayout } from '../components/layout/PublicLayout';

export function PrivacyPolicyPage() {
  return (
    <PublicLayout>
      <section className="border-b border-[#D8D1C4] bg-[#FCFBF8] py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Data Protection · Effective November 2026
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#111C2E]">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#3E4652]">
            Northbridge Capital is committed to safeguarding personal information collected through our public website and authenticated client portal.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-20 space-y-10 text-sm leading-relaxed text-[#3E4652] sm:text-base">
        <div>
          <h2 className="font-serif text-2xl text-[#111C2E]">1. Information We Collect</h2>
          <p className="mt-3">
            When you register for a portal account or submit a contact inquiry, we collect the information you provide directly, including your full name, email address, telephone number (where supplied), and inquiry correspondence. Within the authenticated portal, account records, holdings, ledger entries, administrative requests, and support messages are linked to your verified user identifier.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-[#111C2E]">2. Authentication &amp; Credential Security</h2>
          <p className="mt-3">
            Authentication credentials are processed exclusively through our managed Supabase authentication service using encrypted transport and industry-standard password hashing. Northbridge Capital does not store plaintext passwords in application tables or browser localStorage.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-[#111C2E]">3. Access Isolation &amp; Row-Level Security</h2>
          <p className="mt-3">
            Database access is governed by strict Row-Level Security (RLS) policies. Authenticated clients may only retrieve records associated with their own user identifier. Authorised administrators verified via server-side role functions may review client records solely for account administration and client support.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-[#111C2E]">4. Retention &amp; Client Rights</h2>
          <p className="mt-3">
            Personal and administrative records are retained for as long as required to administer your client portal profile and satisfy institutional record-keeping obligations. You may request access to, correction of, or deletion of personal contact details by writing to our client desk via the Contact page.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}

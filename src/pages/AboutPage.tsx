import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ResilientImage } from '../components/ui/StateDisplay';

export function AboutPage() {
  return (
    <PublicLayout>
      <section className="border-b border-[#D8D1C4] bg-[#FCFBF8] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Institutional Profile · London &amp; Zurich
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium tracking-tight text-[#111C2E] sm:text-5xl">
            Measured governance for private capital administration.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#3E4652]">
            Northbridge Capital was structured around a clear institutional conviction: private-client financial reporting should be calm, verifiable, and unclouded by promotional complexity.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6 space-y-6 text-base leading-relaxed text-[#3E4652]">
            <h2 className="font-serif text-2xl text-[#111C2E]">Our Operating Ethos</h2>
            <p>
              Across London and Zurich, private wealth institutions have long relied on disciplined record-keeping, clear lines of accountability, and thoughtful long-horizon planning. Northbridge Capital brings those administrative standards into an accessible, modern digital client portal.
            </p>
            <p>
              Rather than presenting speculative projections or automated execution gimmicks, our platform emphasises complete clarity around what is recorded on a client&apos;s ledger, how holdings are categorised, and how formal administrative requests are reviewed by authorised personnel.
            </p>
            <h2 className="pt-4 font-serif text-2xl text-[#111C2E]">Governance &amp; Security Controls</h2>
            <p>
              Every client account is protected by authenticated session isolation and row-level database security. Client accounts cannot alter recorded balances, administrative statuses, or ledger histories directly—ensuring that every adjustment is subject to documented institutional oversight.
            </p>
          </div>
          <div className="lg:col-span-6">
            <div className="h-full overflow-hidden border border-[#D8D1C4] bg-[#EAE6DD]">
              <ResilientImage
                src="/src/assets/images/about_private_office_1795357572881.jpg"
                alt="Northbridge Capital Zurich advisory room"
                className="h-full w-full object-cover min-h-[360px]"
              />
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 border-t border-[#D8D1C4] pt-12 md:grid-cols-3">
          <div>
            <p className="font-mono text-xs text-[#8F6F3E]">01</p>
            <h3 className="mt-2 font-serif text-xl text-[#111C2E]">Client-First Confidentiality</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">
              Strict database isolation guarantees that each authenticated client accesses only their own profile, account, holdings, ledger, and support correspondence.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-[#8F6F3E]">02</p>
            <h3 className="mt-2 font-serif text-xl text-[#111C2E]">Plain-Language Reporting</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">
              Financial statements, risk disclosures, and account events are written in clear institutional English without opaque jargon.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-[#8F6F3E]">03</p>
            <h3 className="mt-2 font-serif text-xl text-[#111C2E]">Accountable Administration</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">
              Administrative approvals, broadcasts, and ledger entries are executed exclusively through verified role-checked server procedures.
            </p>
          </div>
        </div>

        <div className="mt-14 border border-[#D8D1C4] bg-[#FCFBF8] p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-xl text-[#111C2E]">Establish or access your client record</p>
            <p className="mt-1 text-sm text-[#3E4652]">
              Review our service architecture or proceed to client registration.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/services"
              className="border border-[#0B1320] px-5 py-2.5 text-sm font-medium text-[#0B1320] hover:bg-[#EAE6DD]/60 transition-colors whitespace-nowrap shrink-0"
            >
              View Services
            </Link>
            <Link
              to="/register"
              className="bg-[#0B1320] px-5 py-2.5 text-sm font-medium text-[#FCFBF8] hover:bg-[#18263D] transition-colors whitespace-nowrap shrink-0"
            >
              Register Account
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

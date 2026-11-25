import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ResilientImage } from '../components/ui/StateDisplay';

const SERVICE_CAPABILITIES = [
  {
    index: '01',
    title: 'Consolidated Portfolio Reporting',
    scope: 'Holdings & Allocation Visibility',
    description:
      'Authenticated clients view recorded holdings grouped by asset category, quantity, and reported valuation alongside clear allocation breakdowns when positions are held on file.',
    details: [
      'Asset name, classification, quantity, and reported value',
      'Visual allocation distribution across asset classes',
      'Read-only record integrity protected by database policies',
    ],
  },
  {
    index: '02',
    title: 'Account & Ledger Administration',
    scope: 'Multi-Currency Record Keeping',
    description:
      'Dedicated account ledgers present verified credits, debits, adjustments, and reference numbers in chronological order, maintaining full transparency of recorded account balances.',
    details: [
      'Account ID, currency designation, and account status',
      'Chronological ledger entries with reference identifiers',
      'Searchable and filterable entry-type history',
    ],
  },
  {
    index: '03',
    title: 'Administrative Financial Requests',
    scope: 'Human-Reviewed Request Workflows',
    description:
      'Clients may submit structured administrative requests for review by authorised Northbridge Capital personnel. Submissions are logged explicitly as review requests rather than automated fund transfers.',
    details: [
      'Clear request classification and client justification notes',
      'Status tracking from pending review to administrative decision',
      'Strict separation from self-service balance alteration',
    ],
  },
  {
    index: '04',
    title: 'Private-Client Correspondence',
    scope: 'Persistent Support Threads',
    description:
      'Integrated client support threads preserve timestamped communications between clients and administrators for documentation enquiries, account updates, and general assistance.',
    details: [
      'Subject-organised message threads with timestamps',
      'Direct administrative replies recorded in one place',
      'Institutional announcements published via broadcast notices',
    ],
  },
];

export function ServicesPage() {
  return (
    <PublicLayout>
      <section className="border-b border-[#D8D1C4] bg-[#FCFBF8] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
                Services &amp; Portal Capabilities
              </p>
              <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#111C2E] sm:text-5xl">
                Structured digital infrastructure for private-client accounts.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#3E4652]">
                Every capability within the Northbridge Capital client portal is engineered for clarity of record, administrative accountability, and calm usability across desktop and mobile devices.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="overflow-hidden border border-[#D8D1C4] bg-[#EAE6DD]">
                <ResilientImage
                  src="/src/assets/images/services_advisory_desk_1795357572805.jpg"
                  alt="Northbridge Capital archival advisory desk"
                  className="h-64 w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="divide-y divide-[#D8D1C4] border-y border-[#D8D1C4]">
          {SERVICE_CAPABILITIES.map((service) => (
            <div key={service.index} className="grid grid-cols-1 gap-8 py-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-mono text-xs text-[#8F6F3E]">
                  {service.index} · {service.scope}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-medium text-[#111C2E]">
                  {service.title}
                </h2>
              </div>
              <div className="lg:col-span-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <p className="text-sm leading-relaxed text-[#3E4652]">{service.description}</p>
                <ul className="space-y-2.5 text-sm text-[#111C2E]">
                  {service.details.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1 w-1 shrink-0 bg-[#B08D57]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 border border-[#D8D1C4] bg-[#0B1320] p-8 text-[#FCFBF8] sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wider uppercase text-[#C6A46E]">
                Scope Clarification
              </p>
              <h3 className="mt-2 font-serif text-2xl text-[#FCFBF8]">
                Informational reporting and administrative review
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#D8D1C4]">
                The Northbridge Capital portal provides structured reporting and administrative request submission. Online registration does not constitute automatic onboarding for regulated investment or payment execution services, and no investment returns are promised or implied.
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-[#B08D57] px-6 py-3 text-sm font-medium text-[#0B1320] hover:bg-[#C6A46E] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Contact Client Desk</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

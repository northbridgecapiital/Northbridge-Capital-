import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ResilientImage } from '../components/ui/StateDisplay';
import { ContactInquiryForm } from '../components/public/ContactInquiryForm';
import { INSIGHT_ARTICLES } from '../data/insights';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const { user, isAdmin } = useAuth();

  return (
    <PublicLayout darkHeader>
      {/* Full-Width Hero Section */}
      <section className="relative overflow-hidden bg-[#0B1320] text-[#FCFBF8]">
        <div className="absolute inset-0">
          <ResilientImage
            src="/src/assets/images/hero_zurich_london_hall_1795357572876.jpg"
            alt="Northbridge Capital London and Zurich architectural atrium"
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1320]/95 via-[#0B1320]/80 to-[#0B1320]/50" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#C6A46E]">
              London · Zurich · Private Wealth Administration
            </p>
            <h1 className="mt-5 font-serif text-4xl font-medium tracking-tight text-[#FCFBF8] sm:text-5xl lg:text-6xl leading-[1.1]">
              Clarity. Discipline. Long-Term Perspective.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-[#D8D1C4] sm:text-lg max-w-xl">
              Northbridge Capital provides a structured digital environment for financial information, portfolio reporting, and private-client account services.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              {user ? (
                <Link
                  to={isAdmin ? '/admin' : '/dashboard'}
                  className="inline-flex items-center gap-2 bg-[#B08D57] px-6 py-3.5 text-sm font-medium text-[#0B1320] transition-colors hover:bg-[#C6A46E] whitespace-nowrap shrink-0"
                >
                  <span>{isAdmin ? 'Open Admin Console' : 'Access Client Dashboard'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 bg-[#B08D57] px-6 py-3.5 text-sm font-medium text-[#0B1320] transition-colors hover:bg-[#C6A46E] whitespace-nowrap shrink-0"
                  >
                    <span>Client Login</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center border border-[#D8D1C4]/45 bg-[#0B1320]/50 px-6 py-3.5 text-sm font-medium text-[#FCFBF8] transition-colors hover:border-[#C6A46E] hover:bg-[#111C2E] whitespace-nowrap shrink-0"
                  >
                    Client Registration
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Principles Bar */}
      <section className="border-b border-[#D8D1C4] bg-[#FCFBF8]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-[#EAE6DD] px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
          <div className="py-7 md:pr-8">
            <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">01 · Reporting Clarity</p>
            <p className="mt-2 font-serif text-lg text-[#111C2E]">Verified Ledger Transparency</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#3E4652]">
              Every recorded entry, balance, and administrative review is presented with explicit dates, currencies, and audit references.
            </p>
          </div>
          <div className="py-7 md:px-8">
            <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">02 · Separation of Duties</p>
            <p className="mt-2 font-serif text-lg text-[#111C2E]">Structured Administrative Review</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#3E4652]">
              Client requests enter formal review queues governed by role-isolated security policies rather than automated self-execution.
            </p>
          </div>
          <div className="py-7 md:pl-8">
            <p className="text-xs font-medium tracking-wider uppercase text-[#8F6F3E]">03 · Risk Candour</p>
            <p className="mt-2 font-serif text-lg text-[#111C2E]">No Guaranteed Return Claims</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#3E4652]">
              We publish objective market commentary and full risk disclosures without speculative forecasts or performance promises.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="h-full overflow-hidden border border-[#D8D1C4] bg-[#EAE6DD]">
              <ResilientImage
                src="/src/assets/images/about_private_office_1795357572881.jpg"
                alt="Northbridge Capital Zurich private advisory boardroom"
                className="h-full w-full object-cover min-h-[320px]"
              />
            </div>
          </div>
          <div className="flex flex-col justify-center lg:col-span-6 lg:pl-4">
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
              About Northbridge Capital
            </p>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-[#111C2E] sm:text-4xl">
              Institutional stewardship grounded in London and Zurich traditions.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#3E4652]">
              Northbridge Capital serves private individuals, family offices, and holding structures seeking an orderly digital environment for account oversight and structured client communications.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[#3E4652]">
              Our philosophy prioritises plain-spoken documentation, durable record-keeping, and disciplined governance over short-term market noise. Every client portal view is backed by row-isolated database permissions and verifiable administrative trails.
            </p>
            <div className="mt-8">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 border-b border-[#0B1320] pb-1 text-sm font-medium text-[#0B1320] transition-colors hover:border-[#B08D57] hover:text-[#8F6F3E]"
              >
                <span>Read our institutional profile</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="border-y border-[#D8D1C4] bg-[#FCFBF8] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
                  Client Services
                </p>
                <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-[#111C2E] sm:text-4xl">
                  Structured reporting and private-client administration.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#3E4652]">
                  Our digital portal consolidates account status, recorded holdings, ledger history, and direct correspondence with our administrative desk.
                </p>
              </div>
              <div className="mt-8 overflow-hidden border border-[#D8D1C4] bg-[#EAE6DD]">
                <ResilientImage
                  src="/src/assets/images/services_advisory_desk_1795357572805.jpg"
                  alt="Private client archival ledger desk at Northbridge Capital"
                  className="h-64 w-full object-cover lg:h-72"
                />
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 gap-px bg-[#D8D1C4] border border-[#D8D1C4] sm:grid-cols-2">
              <div className="bg-[#FCFBF8] p-8 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-xs text-[#8F6F3E]">01</p>
                  <h3 className="mt-3 font-serif text-xl text-[#111C2E]">Consolidated Portfolio Reporting</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#3E4652]">
                    Clear breakdown of recorded asset categories, quantities, and reported valuations presented alongside allocation visualisations when holdings are present.
                  </p>
                </div>
              </div>
              <div className="bg-[#FCFBF8] p-8 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-xs text-[#8F6F3E]">02</p>
                  <h3 className="mt-3 font-serif text-xl text-[#111C2E]">Multi-Currency Ledger Records</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#3E4652]">
                    Chronological account ledger entries showing exact dates, descriptions, reference codes, entry types, and settlement statuses.
                  </p>
                </div>
              </div>
              <div className="bg-[#FCFBF8] p-8 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-xs text-[#8F6F3E]">03</p>
                  <h3 className="mt-3 font-serif text-xl text-[#111C2E]">Administrative Review Queue</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#3E4652]">
                    Formal submission of client financial requests for human administrative review, maintaining strict separation between inquiries and ledger entries.
                  </p>
                </div>
              </div>
              <div className="bg-[#FCFBF8] p-8 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-xs text-[#8F6F3E]">04</p>
                  <h3 className="mt-3 font-serif text-xl text-[#111C2E]">Direct Client Correspondence</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#3E4652]">
                    Persistent, timestamped support threads connecting authenticated clients directly with Northbridge Capital client-services personnel.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0B1320] hover:text-[#8F6F3E] transition-colors"
            >
              <span>Explore full service capabilities</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Market Insights Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#D8D1C4] pb-6">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
              Research &amp; Perspective
            </p>
            <h2 className="mt-2 font-serif text-3xl font-medium text-[#111C2E]">
              Market Insights
            </h2>
          </div>
          <Link
            to="/insights"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0B1320] hover:text-[#8F6F3E] transition-colors whitespace-nowrap shrink-0"
          >
            <span>All research notes</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-5 border border-[#D8D1C4] bg-[#0B1320] text-[#FCFBF8] flex flex-col justify-between">
            <div className="h-56 overflow-hidden">
              <ResilientImage
                src="/src/assets/images/insights_financial_facade_1795357573004.jpg"
                alt="European financial district architectural facade at dawn"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-7 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#C6A46E]">
                  {INSIGHT_ARTICLES[0].category} · {INSIGHT_ARTICLES[0].publishedAt}
                </p>
                <h3 className="mt-2.5 font-serif text-2xl text-[#FCFBF8]">
                  {INSIGHT_ARTICLES[0].title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#D8D1C4]">
                  {INSIGHT_ARTICLES[0].summary}
                </p>
              </div>
              <div className="mt-6">
                <Link
                  to="/insights"
                  className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#C6A46E] hover:text-[#FCFBF8]"
                >
                  <span>Read Briefing</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 divide-y divide-[#D8D1C4] border-y border-[#D8D1C4]">
            {INSIGHT_ARTICLES.slice(1).map((article) => (
              <article key={article.id} className="py-6 first:pt-5 last:pb-5">
                <p className="text-xs text-[#3E4652]">
                  {article.category} · {article.publishedAt} · {article.readTime}
                </p>
                <h3 className="mt-2 font-serif text-xl text-[#111C2E]">
                  <Link to="/insights" className="hover:text-[#8F6F3E] transition-colors">
                    {article.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">{article.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Risk & Transparency Section */}
      <section className="bg-[#111C2E] text-[#FCFBF8] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#C6A46E]">
                Risk &amp; Transparency
              </p>
              <h2 className="mt-3 font-serif text-3xl font-medium text-[#FCFBF8]">
                Clear disclosure precedes every financial decision.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#D8D1C4] max-w-2xl">
                All financial markets involve risk of loss, currency fluctuations, and periods of illiquidity. Northbridge Capital does not promise or guarantee investment returns. Client portal records reflect verified administrative entries and informational valuations only.
              </p>
            </div>
            <div className="lg:col-span-4 lg:flex lg:justify-end">
              <Link
                to="/risk-disclosure"
                className="inline-flex items-center gap-2 border border-[#C6A46E]/60 px-6 py-3 text-sm font-medium text-[#FCFBF8] transition-colors hover:bg-[#B08D57] hover:text-[#0B1320] whitespace-nowrap shrink-0"
              >
                <span>Read Risk Disclosure</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
              Contact &amp; Inquiries
            </p>
            <h2 className="mt-3 font-serif text-3xl font-medium text-[#111C2E]">
              Speak with our private-client desk.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#3E4652]">
              For onboarding inquiries, institutional documentation, or portal assistance, please send correspondence below or reach our London and Zurich offices directly.
            </p>

            <dl className="mt-8 space-y-5 border-t border-[#D8D1C4] pt-6 text-sm">
              <div>
                <dt className="font-medium text-[#111C2E]">London Desk</dt>
                <dd className="mt-1 text-[#3E4652]">18 St James&apos;s Square, London SW1Y 4JG, United Kingdom</dd>
              </div>
              <div>
                <dt className="font-medium text-[#111C2E]">Zurich Desk</dt>
                <dd className="mt-1 text-[#3E4652]">Bahnhofstrasse 42, 8001 Zurich, Switzerland</dd>
              </div>
              <div>
                <dt className="font-medium text-[#111C2E]">Client Correspondence</dt>
                <dd className="mt-1.5 flex flex-col items-start gap-2.5">
                  <span className="font-mono text-xs text-[#3E4652]">northbridgecapiital@gmail.com</span>
                  <a
                    href="mailto:northbridgecapiital@gmail.com?subject=Northbridge%20Capital%20Client%20Inquiry"
                    className="inline-flex items-center gap-2 border border-[#0B1320] bg-[#FCFBF8] px-4 py-2 text-xs font-medium text-[#0B1320] transition-colors hover:bg-[#0B1320] hover:text-[#FCFBF8]"
                  >
                    Email Client Desk
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-7 border border-[#D8D1C4] bg-[#FCFBF8] p-6 sm:p-8">
            <ContactInquiryForm source="homepage_contact" />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

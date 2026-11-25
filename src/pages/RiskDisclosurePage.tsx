import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';

const RISK_SECTIONS = [
  {
    number: '01',
    title: 'No Guarantee of Returns or Capital Preservation',
    content:
      'Northbridge Capital makes no representation, warranty, or guarantee—express or implied—regarding the future performance of any asset, currency, fixed-income instrument, or portfolio strategy. Capital values and income may fluctuate downward as well as upward, and clients may recover less than their original principal.',
  },
  {
    number: '02',
    title: 'Informational Nature of Portal Reporting',
    content:
      'Figures, holdings summaries, ledger entries, and market commentary displayed inside the Northbridge Capital portal are provided strictly for informational and administrative record-keeping purposes. Nothing presented on this website or inside the authenticated portal constitutes personalised investment, tax, accounting, or legal advice.',
  },
  {
    number: '03',
    title: 'Market, Interest Rate & Credit Risk',
    content:
      'Market valuations respond to changes in macroeconomic policy, inflation expectations, sovereign fiscal conditions, corporate credit quality, and geopolitical developments. Debt instruments are sensitive to interest-rate movements and issuer creditworthiness; equity and alternative exposures carry heightened price volatility.',
  },
  {
    number: '04',
    title: 'Currency & Foreign-Exchange Exposure',
    content:
      'Accounts or holdings denominated in currencies other than a client’s domestic reference currency (including GBP, CHF, EUR, and USD) are exposed to exchange-rate movements. Adverse currency shifts can reduce reported valuations even when underlying asset prices remain stable.',
  },
  {
    number: '05',
    title: 'Liquidity & Valuation Timing Risk',
    content:
      'Certain private, fixed-term, or thinly traded assets may experience limited secondary market liquidity or delayed valuation reporting. Recorded values reflect the latest verified administrative data available on file and may differ from realisable liquidation proceeds.',
  },
  {
    number: '06',
    title: 'Onboarding & Administrative Request Boundaries',
    content:
      'Registering for a digital client account or submitting an administrative financial request does not automatically approve an individual or entity for regulated financial services, nor does it execute an immediate payment, deposit, or withdrawal. All formal requests remain subject to compliance, identity verification, and human administrative review.',
  },
];

export function RiskDisclosurePage() {
  return (
    <PublicLayout>
      <section className="border-b border-[#D8D1C4] bg-[#FCFBF8] py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
            Governance &amp; Transparency
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#111C2E] sm:text-5xl">
            Investment Risk Disclosure
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#3E4652]">
            Please review these risk considerations carefully before relying on any financial information or submitting administrative requests through the Northbridge Capital client environment.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-20">
        <div className="divide-y divide-[#D8D1C4] border-y border-[#D8D1C4]">
          {RISK_SECTIONS.map((section) => (
            <div key={section.number} className="py-8">
              <p className="font-mono text-xs text-[#8F6F3E]">Section {section.number}</p>
              <h2 className="mt-2 font-serif text-2xl text-[#111C2E]">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#3E4652] sm:text-base">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-sm text-[#3E4652]">
          <p>Questions regarding our disclosures may be directed to our client desk.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="font-medium text-[#0B1320] underline underline-offset-4">
              Terms of Service
            </Link>
            <Link to="/contact" className="font-medium text-[#0B1320] underline underline-offset-4">
              Contact Desk
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

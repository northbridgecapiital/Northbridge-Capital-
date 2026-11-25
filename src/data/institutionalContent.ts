export const COMPANY_EMAIL = 'northbridgecapiital@gmail.com';

export const OFFICE_LOCATIONS = [
  {
    region: 'United Kingdom',
    title: 'London Office',
    lines: ["18 St James's Square", 'London SW1Y 4JG', 'United Kingdom'],
    hours: 'Mon–Fri · 08:30–17:30 GMT',
  },
  {
    region: 'Switzerland',
    title: 'Zurich Office',
    lines: ['Bahnhofstrasse 42', '8001 Zurich', 'Switzerland'],
    hours: 'Mon–Fri · 08:30–17:30 CET',
  },
] as const;

export const ABOUT_PILLARS = [
  {
    index: '01',
    title: 'Client-First Confidentiality',
    description:
      'Strict database isolation guarantees that each authenticated client accesses only their own profile, account, holdings, ledger, and support correspondence.',
  },
  {
    index: '02',
    title: 'Plain-Language Reporting',
    description:
      'Financial statements, risk disclosures, and account events are written in clear institutional English without opaque jargon.',
  },
  {
    index: '03',
    title: 'Accountable Administration',
    description:
      'Administrative approvals, broadcasts, and ledger entries are executed exclusively through verified role-checked server procedures.',
  },
] as const;

export const SERVICE_CAPABILITIES = [
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
] as const;

export const RISK_SECTIONS = [
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
] as const;

export const PRIVACY_SECTIONS = [
  {
    title: '1. Information We Collect',
    content:
      'When you register for a portal account or submit a contact inquiry, we collect the information you provide directly, including your full name, email address, and inquiry correspondence. Within the authenticated portal, account records, holdings, ledger entries, administrative requests, and support messages are linked to your verified user identifier.',
  },
  {
    title: '2. Authentication & Credential Security',
    content:
      'Authentication credentials are processed exclusively through our managed Supabase authentication service using encrypted transport and industry-standard password hashing. Northbridge Capital does not store plaintext passwords in application tables or browser localStorage.',
  },
  {
    title: '3. Access Isolation & Row-Level Security',
    content:
      'Database access is governed by strict Row-Level Security (RLS) policies. Authenticated clients may only retrieve records associated with their own user identifier. Authorised administrators verified via server-side role functions may review client records solely for account administration and client support.',
  },
  {
    title: '4. Retention & Client Rights',
    content:
      'Personal and administrative records are retained for as long as required to administer your client portal profile and satisfy institutional record-keeping obligations. You may request access to, correction of, or deletion of personal contact details by writing to our client desk via the Support Centre or Contact section.',
  },
] as const;

export const TERMS_SECTIONS = [
  {
    title: '1. Informational Scope',
    content:
      'The Northbridge Capital platform provides structured financial information, portfolio reporting views, ledger history, and administrative request tools. Portal registration does not establish a fiduciary advisory mandate or automatically qualify an applicant for regulated investment services.',
  },
  {
    title: '2. Account Registration & Verification',
    content:
      'Users must provide accurate identity details upon registration and complete email verification before signing in. You are responsible for maintaining the confidentiality of your login credentials and notifying Northbridge Capital promptly of any suspected unauthorised access.',
  },
  {
    title: '3. Administrative Requests',
    content:
      'Financial requests submitted through the portal are formal review inquiries only. They do not constitute completed deposits, withdrawals, or payment instructions. Northbridge Capital reserves the right to request additional documentation or decline any administrative request in accordance with internal governance standards.',
  },
  {
    title: '4. Risk Acknowledgement',
    content:
      'All users acknowledge the considerations outlined in our Investment Risk Disclosure, including the absence of any guaranteed financial returns.',
  },
] as const;

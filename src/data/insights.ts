export interface InsightArticle {
  id: string;
  title: string;
  category: 'Fixed Income' | 'Currency & Macro' | 'Governance' | 'Liquidity';
  publishedAt: string;
  readTime: string;
  author: string;
  summary: string;
  body: string[];
}

export const INSIGHT_ARTICLES: InsightArticle[] = [
  {
    id: 'sovereign-duration-discipline',
    title: 'Duration Positioning Amid Divergent Central Bank Cycles',
    category: 'Fixed Income',
    publishedAt: 'November 2026',
    readTime: '6 min read',
    author: 'Fixed Income Research Desk · London',
    summary:
      'Evaluating real yield curves across G10 sovereign issuers as policy rate paths diverge between the Bank of England, the Swiss National Bank, and the Federal Reserve.',
    body: [
      'Cross-market dispersion across developed-market government yield curves has widened meaningfully over the past twelve months. Where synchronised tightening previously compressed term premia across jurisdictions, regional inflation dynamics and fiscal trajectories now require granular, currency-hedged analysis.',
      'From a reporting and risk-budgeting perspective, institutional mandates benefit from separating nominal coupon income from currency translation effects. Unhedged sovereign exposure introduces foreign-exchange volatility that can dominate fixed-income return variance over medium horizons.',
      'Northbridge Capital encourages clients reviewing fixed-income allocations to examine maturity ladders alongside liquidity schedules rather than relying on point-in-time yield comparisons. Past yield behaviour does not indicate future returns, and bond valuations remain sensitive to unexpected shifts in inflation expectations.',
    ],
  },
  {
    id: 'swiss-franc-liquidity-reserves',
    title: 'Multi-Currency Cash Management & Counterparty Concentration',
    category: 'Currency & Macro',
    publishedAt: 'October 2026',
    readTime: '5 min read',
    author: 'Treasury & FX Desk · Zurich',
    summary:
      'Operational frameworks for structuring CHF, GBP, EUR, and USD operating reserves while monitoring institutional credit exposure and settlement timelines.',
    body: [
      'For internationally mobile households and holding structures, liquidity reserves serve as operational ballast rather than a primary return engine. Concentrating cash balances in a single currency or institution can create unintended exposure during periods of currency repricing or operational disruption.',
      'A disciplined treasury framework maps near-term obligations—tax liabilities, capital commitments, and operating expenses—to corresponding currency buckets, while recording every ledger movement with auditable references and settlement statuses.',
      'All currency balances carry exchange-rate risk relative to a client’s base reporting currency. Clients should review multi-currency ledger statements periodically with qualified tax and legal advisers.',
    ],
  },
  {
    id: 'governance-transparency-ledgers',
    title: 'Why Auditable Ledger Architecture Matters in Private Wealth',
    category: 'Governance',
    publishedAt: 'September 2026',
    readTime: '4 min read',
    author: 'Client Governance Group · Zurich & London',
    summary:
      'How separation of duties, immutable audit trails, and explicit administrative request workflows protect record integrity in digital client portals.',
    body: [
      'Digital wealth portals frequently blur the boundary between informational reporting and transactional execution. In institutional administration, clarity requires separating what a client views, what a client requests, and what is formally recorded on an audited ledger.',
      'When administrative requests—such as statement reconciliations, currency reclassifications, or custody review inquiries—pass through structured review queues with explicit approval states and reference numbers, both clients and administrators gain an unambiguous historical record.',
      'At Northbridge Capital, our digital environment reflects this separation: balances and holdings are strictly read-only from the client view, while every administrative adjustment leaves a documented audit trail.',
    ],
  },
  {
    id: 'illiquidity-budgeting-private-assets',
    title: 'Assessing Horizon Mismatch in Long-Dated Commitments',
    category: 'Liquidity',
    publishedAt: 'August 2026',
    readTime: '7 min read',
    author: 'Portfolio Architecture Desk · London',
    summary:
      'A structured approach to balancing marketable securities against multi-year capital commitments without overestimating secondary liquidity.',
    body: [
      'Long-term capital structures frequently combine liquid public securities with multi-year private commitments. While less-liquid holdings may offer differentiated risk exposures, valuation lags and lock-up schedules require conservative liquidity stress testing.',
      'Rather than assuming secondary markets will remain deep during periods of market stress, prudent portfolio oversight quantifies committed versus uncalled obligations against liquid reserves under adverse scenarios.',
      'This commentary is prepared for general educational and informational purposes only and does not constitute a recommendation for any specific asset class or investment strategy.',
    ],
  },
];

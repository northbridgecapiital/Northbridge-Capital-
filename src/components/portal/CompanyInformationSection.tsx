import React, { useState } from 'react';
import {
  ABOUT_PILLARS,
  COMPANY_EMAIL,
  OFFICE_LOCATIONS,
  PRIVACY_SECTIONS,
  RISK_SECTIONS,
  SERVICE_CAPABILITIES,
  TERMS_SECTIONS,
} from '../../data/institutionalContent';
import { INSIGHT_ARTICLES } from '../../data/insights';
import { formatDateTime } from '../../lib/formatters';
import { sendClientSupportMessage } from '../../lib/portalApi';
import type { BroadcastRecord } from '../../types/database';
import { AlertBanner, EmptyState, ResilientImage, TableSkeleton } from '../ui/StateDisplay';

type CompanySubTab =
  | 'about'
  | 'services'
  | 'insights'
  | 'risk'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'announcements';

const SUB_TABS: Array<{ id: CompanySubTab; label: string }> = [
  { id: 'about', label: 'About Northbridge Capital' },
  { id: 'services', label: 'Our Services' },
  { id: 'insights', label: 'Market Insights' },
  { id: 'risk', label: 'Risk Disclosures' },
  { id: 'contact', label: 'Contact & Client Support' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'announcements', label: 'Company Announcements' },
];

export function CompanyInformationSection({
  broadcasts,
  dataLoading,
  clientName,
  clientEmail,
  userId,
  onNavigateSection,
  onMessageSentToAdmin,
}: {
  broadcasts: BroadcastRecord[];
  dataLoading: boolean;
  clientName: string;
  clientEmail: string;
  userId: string;
  onNavigateSection: (sectionId: string) => void;
  onMessageSentToAdmin: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<CompanySubTab>('about');
  const [selectedInsightId, setSelectedInsightId] = useState<string>(INSIGHT_ARTICLES[0].id);

  // Direct inquiry to Admin Control (support_threads)
  const [inquirySubject, setInquirySubject] = useState('Private Client Services Inquiry');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryFeedback, setInquiryFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const activeInsight =
    INSIGHT_ARTICLES.find((a) => a.id === selectedInsightId) ?? INSIGHT_ARTICLES[0];

  async function handleDirectAdminInquiry(e: React.FormEvent) {
    e.preventDefault();
    setInquiryFeedback(null);

    if (inquiryMessage.trim().length < 5) {
      setInquiryFeedback({
        tone: 'error',
        message: 'Please enter a brief message before sending to administration.',
      });
      return;
    }

    setSubmittingInquiry(true);
    const res = await sendClientSupportMessage({
      userId,
      subject: inquirySubject,
      message: inquiryMessage,
    });
    setSubmittingInquiry(false);

    if (res.error) {
      setInquiryFeedback({ tone: 'error', message: res.error });
      return;
    }

    setInquiryMessage('');
    setInquiryFeedback({
      tone: 'success',
      message:
        'Your inquiry has been routed directly to Northbridge Capital administration. You can track replies in Support Centre.',
    });
    await onMessageSentToAdmin();
  }

  return (
    <div className="space-y-6">
      <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-6">
        <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
          Institutional Reference Library
        </p>
        <h3 className="mt-1 font-serif text-2xl text-[#111C2E]">
          Company Information &amp; Governance Disclosures
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#3E4652]">
          Review Northbridge Capital&apos;s institutional background, service scope, market research, risk disclosures, legal terms, and direct correspondence channels without leaving your authenticated portal.
        </p>

        <div
          className="mt-6 flex flex-wrap gap-2 border-t border-[#EAE6DD] pt-5"
          role="tablist"
          aria-label="Company Information sections"
        >
          {SUB_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[40px] px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0B1320] text-[#FCFBF8]'
                    : 'border border-[#D8D1C4] bg-[#F7F5F0] text-[#3E4652] hover:border-[#0B1320] hover:text-[#111C2E]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. ABOUT NORTHBRIDGE CAPITAL */}
      {activeTab === 'about' ? (
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4 text-sm leading-relaxed text-[#3E4652] sm:text-base">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
                Institutional Profile · London &amp; Zurich
              </p>
              <h4 className="font-serif text-2xl sm:text-3xl text-[#111C2E]">
                Measured governance for private capital administration.
              </h4>
              <p>
                Northbridge Capital was structured around a clear institutional conviction: private-client financial reporting should be calm, verifiable, and unclouded by promotional complexity.
              </p>
              <p>
                Across London and Zurich, private wealth institutions have long relied on disciplined record-keeping, clear lines of accountability, and thoughtful long-horizon planning. Northbridge Capital brings those administrative standards into an accessible, modern digital client portal.
              </p>
              <p>
                Rather than presenting speculative projections or automated execution gimmicks, our platform emphasises complete clarity around what is recorded on a client&apos;s ledger, how holdings are categorised, and how formal administrative requests are reviewed by authorised personnel.
              </p>
              <p>
                Every client account is protected by authenticated session isolation and row-level database security. Client accounts cannot alter recorded balances, administrative statuses, or ledger histories directly—ensuring that every adjustment is subject to documented institutional oversight.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="h-full overflow-hidden border border-[#D8D1C4] bg-[#EAE6DD]">
                <ResilientImage
                  src="/src/assets/images/about_private_office_1795357572881.jpg"
                  alt="Northbridge Capital Zurich private advisory room"
                  className="h-full w-full object-cover min-h-[280px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 border-t border-[#EAE6DD] pt-8 md:grid-cols-3">
            {ABOUT_PILLARS.map((pillar) => (
              <div key={pillar.index}>
                <p className="font-mono text-xs text-[#8F6F3E]">{pillar.index}</p>
                <h5 className="mt-2 font-serif text-lg text-[#111C2E]">{pillar.title}</h5>
                <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 2. OUR SERVICES */}
      {activeTab === 'services' ? (
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center border-b border-[#EAE6DD] pb-8">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
                Services &amp; Portal Capabilities
              </p>
              <h4 className="mt-2 font-serif text-2xl sm:text-3xl text-[#111C2E]">
                Structured digital infrastructure for private-client accounts.
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-[#3E4652] sm:text-base">
                Every capability within the Northbridge Capital client portal is engineered for clarity of record, administrative accountability, and calm usability across desktop and mobile devices.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="overflow-hidden border border-[#D8D1C4] bg-[#EAE6DD]">
                <ResilientImage
                  src="/src/assets/images/services_advisory_desk_1795357572805.jpg"
                  alt="Northbridge Capital archival advisory desk"
                  className="h-52 w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#EAE6DD]">
            {SERVICE_CAPABILITIES.map((service) => (
              <div key={service.index} className="grid grid-cols-1 gap-6 py-7 first:pt-0 last:pb-0 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <p className="font-mono text-xs text-[#8F6F3E]">
                    {service.index} · {service.scope}
                  </p>
                  <h5 className="mt-1.5 font-serif text-xl text-[#111C2E]">{service.title}</h5>
                </div>
                <div className="lg:col-span-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <p className="text-sm leading-relaxed text-[#3E4652]">{service.description}</p>
                  <ul className="space-y-2 text-sm text-[#111C2E]">
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

          <div className="border border-[#D8D1C4] bg-[#0B1320] p-6 text-[#FCFBF8] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wider uppercase text-[#C6A46E]">
                Scope Clarification
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#D8D1C4]">
                The Northbridge Capital portal provides structured reporting and administrative request submission. Online registration does not constitute automatic onboarding for regulated investment or payment execution services, and no investment returns are promised or implied.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('deposits')}
              className="bg-[#B08D57] px-5 py-2.5 text-xs font-medium text-[#0B1320] hover:bg-[#C6A46E] transition-colors whitespace-nowrap shrink-0"
            >
              Open Deposit &amp; Financial Requests
            </button>
          </div>
        </div>
      ) : null}

      {/* 3. MARKET INSIGHTS */}
      {activeTab === 'insights' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 border border-[#D8D1C4] bg-[#FCFBF8] divide-y divide-[#EAE6DD] self-start">
            <div className="p-5 border-b border-[#EAE6DD]">
              <h4 className="font-serif text-lg text-[#111C2E]">Research Briefings</h4>
              <p className="mt-1 text-xs text-[#3E4652]">
                Informational institutional notes. Select a briefing to read in full or open the dedicated Market Insights view.
              </p>
            </div>
            {INSIGHT_ARTICLES.map((article) => {
              const selected = article.id === activeInsight.id;
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setSelectedInsightId(article.id)}
                  className={`w-full text-left p-5 transition-colors ${
                    selected ? 'bg-[#F7F5F0]' : 'hover:bg-[#F7F5F0]/60'
                  }`}
                >
                  <p className="text-xs text-[#8F6F3E]">
                    {article.category} · {article.publishedAt}
                  </p>
                  <p className="mt-1 font-serif text-base text-[#111C2E]">{article.title}</p>
                </button>
              );
            })}
            <div className="p-4">
              <button
                type="button"
                onClick={() => onNavigateSection('insights')}
                className="w-full border border-[#0B1320] px-4 py-2 text-xs font-medium text-[#0B1320] hover:bg-[#0B1320] hover:text-[#FCFBF8] transition-colors"
              >
                Open Full Market Insights Reader
              </button>
            </div>
          </div>

          <article className="lg:col-span-7 border border-[#D8D1C4] bg-[#FCFBF8]">
            <div className="h-44 overflow-hidden border-b border-[#D8D1C4]">
              <ResilientImage
                src="/src/assets/images/insights_financial_facade_1795357573004.jpg"
                alt="European financial district architecture"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-xs text-[#8F6F3E]">
                {activeInsight.category} · {activeInsight.publishedAt} · {activeInsight.readTime}
              </p>
              <h4 className="mt-2 font-serif text-2xl text-[#111C2E]">{activeInsight.title}</h4>
              <p className="mt-1 text-xs text-[#3E4652]">{activeInsight.author}</p>
              <div className="mt-5 space-y-4 border-t border-[#EAE6DD] pt-5 text-sm leading-relaxed text-[#3E4652]">
                {activeInsight.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {/* 4. RISK DISCLOSURES */}
      {activeTab === 'risk' ? (
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
              Governance &amp; Transparency
            </p>
            <h4 className="mt-1 font-serif text-2xl text-[#111C2E]">
              Investment Risk Disclosure
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">
              Please review these risk considerations carefully before relying on any financial information or submitting administrative requests through the Northbridge Capital client environment.
            </p>
          </div>
          <div className="divide-y divide-[#EAE6DD] border-y border-[#EAE6DD]">
            {RISK_SECTIONS.map((section) => (
              <div key={section.number} className="py-6">
                <p className="font-mono text-xs text-[#8F6F3E]">Section {section.number}</p>
                <h5 className="mt-1.5 font-serif text-xl text-[#111C2E]">{section.title}</h5>
                <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 5. CONTACT & CLIENT SUPPORT */}
      {activeTab === 'contact' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 border border-[#D8D1C4] bg-[#FCFBF8] p-6 space-y-6">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
                Private-Client Desks
              </p>
              <h4 className="mt-1 font-serif text-xl text-[#111C2E]">
                Contact &amp; Client Support
              </h4>
            </div>

            {OFFICE_LOCATIONS.map((office) => (
              <div key={office.title} className="border-t border-[#EAE6DD] pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#8F6F3E]">
                  {office.region}
                </p>
                <p className="mt-1 font-serif text-lg text-[#111C2E]">{office.title}</p>
                <p className="mt-1 text-sm text-[#3E4652]">
                  {office.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
                <p className="mt-2 font-mono text-xs text-[#3E4652]">{office.hours}</p>
              </div>
            ))}

            <div className="border-t border-[#EAE6DD] pt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[#8F6F3E]">
                Client Email Desk
              </p>
              <p className="font-mono text-sm text-[#111C2E]">{COMPANY_EMAIL}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${COMPANY_EMAIL}?subject=Northbridge%20Capital%20Client%20Portal%20Inquiry`}
                  className="inline-flex items-center justify-center bg-[#0B1320] px-4 py-2 text-xs font-medium text-[#FCFBF8] hover:bg-[#18263D] transition-colors whitespace-nowrap"
                >
                  Email {COMPANY_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={() => onNavigateSection('support')}
                  className="inline-flex items-center justify-center border border-[#0B1320] px-4 py-2 text-xs font-medium text-[#0B1320] hover:bg-[#EAE6DD]/60 transition-colors whitespace-nowrap"
                >
                  Open Support Centre
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 border border-[#D8D1C4] bg-[#FCFBF8] p-6 space-y-5">
            <div>
              <h4 className="font-serif text-xl text-[#111C2E]">
                Direct Correspondence to Administration
              </h4>
              <p className="mt-1 text-xs text-[#3E4652]">
                Submitting here logs a tracked message as <span className="font-medium text-[#111C2E]">{clientName}</span> ({clientEmail}) straight to the Administrator Console so an authorised administrator can reply inside your Support Centre.
              </p>
            </div>

            {inquiryFeedback ? (
              <AlertBanner
                tone={inquiryFeedback.tone}
                message={inquiryFeedback.message}
                onDismiss={() => setInquiryFeedback(null)}
              />
            ) : null}

            <form onSubmit={handleDirectAdminInquiry} className="space-y-4">
              <div>
                <label htmlFor="portal-inq-subj" className="block text-xs font-medium text-[#111C2E]">
                  Topic
                </label>
                <select
                  id="portal-inq-subj"
                  value={inquirySubject}
                  onChange={(e) => setInquirySubject(e.target.value)}
                  className="mt-1.5 w-full border border-[#D8D1C4] bg-white px-3 py-2.5 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
                >
                  <option value="Private Client Services Inquiry">Private Client Services Inquiry</option>
                  <option value="Account & Statement Review">Account &amp; Statement Review</option>
                  <option value="Site Experience & Service Review">Site Experience &amp; Service Review</option>
                  <option value="Institutional Documentation Request">Institutional Documentation Request</option>
                </select>
              </div>

              <div>
                <label htmlFor="portal-inq-msg" className="block text-xs font-medium text-[#111C2E]">
                  Message for Administration
                </label>
                <textarea
                  id="portal-inq-msg"
                  rows={4}
                  required
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  placeholder="Outline your question, documentation request, or portal review note..."
                  className="mt-1.5 w-full border border-[#D8D1C4] bg-white px-3.5 py-2.5 text-sm text-[#111C2E] focus:border-[#0B1320] focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingInquiry}
                  className="bg-[#0B1320] px-5 py-2.5 text-xs font-medium text-[#FCFBF8] hover:bg-[#18263D] disabled:opacity-50"
                >
                  {submittingInquiry ? 'Sending to Administration...' : 'Send to Administration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* 6. PRIVACY POLICY */}
      {activeTab === 'privacy' ? (
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
              Data Protection · Effective November 2026
            </p>
            <h4 className="mt-1 font-serif text-2xl text-[#111C2E]">Privacy Policy</h4>
            <p className="mt-2 text-sm text-[#3E4652]">
              Northbridge Capital is committed to safeguarding personal information collected through our public website and authenticated client portal.
            </p>
          </div>
          <div className="divide-y divide-[#EAE6DD] border-y border-[#EAE6DD]">
            {PRIVACY_SECTIONS.map((sec) => (
              <div key={sec.title} className="py-6">
                <h5 className="font-serif text-xl text-[#111C2E]">{sec.title}</h5>
                <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">{sec.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 7. TERMS & CONDITIONS */}
      {activeTab === 'terms' ? (
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
              Portal Governance · Effective November 2026
            </p>
            <h4 className="mt-1 font-serif text-2xl text-[#111C2E]">Terms and Conditions</h4>
            <p className="mt-2 text-sm text-[#3E4652]">
              These Terms govern your access to and use of the Northbridge Capital website and private-client digital portal.
            </p>
          </div>
          <div className="divide-y divide-[#EAE6DD] border-y border-[#EAE6DD]">
            {TERMS_SECTIONS.map((sec) => (
              <div key={sec.title} className="py-6">
                <h5 className="font-serif text-xl text-[#111C2E]">{sec.title}</h5>
                <p className="mt-2 text-sm leading-relaxed text-[#3E4652]">{sec.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 8. COMPANY ANNOUNCEMENTS */}
      {activeTab === 'announcements' ? (
        <div className="border border-[#D8D1C4] bg-[#FCFBF8] p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE6DD] pb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#8F6F3E]">
                Official Broadcast Feed
              </p>
              <h4 className="mt-1 font-serif text-2xl text-[#111C2E]">Company Announcements</h4>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('notifications')}
              className="border border-[#0B1320] px-4 py-2 text-xs font-medium text-[#0B1320] hover:bg-[#0B1320] hover:text-[#FCFBF8] transition-colors whitespace-nowrap"
            >
              Open Notifications &amp; Announcements
            </button>
          </div>

          {dataLoading ? (
            <TableSkeleton rows={3} cols={2} />
          ) : broadcasts.length === 0 ? (
            <EmptyState
              title="No Company Announcements Published"
              description="Official notices published by verified Northbridge Capital administrators will appear here."
            />
          ) : (
            <div className="divide-y divide-[#EAE6DD]">
              {broadcasts.map((item) => (
                <article key={item.id} className="py-5 first:pt-0 last:pb-0">
                  <p className="text-xs text-[#8F6F3E]">
                    {item.category || 'Institutional Notice'} ·{' '}
                    {formatDateTime(item.published_at || item.created_at)}
                  </p>
                  <h5 className="mt-1.5 font-serif text-lg text-[#111C2E]">
                    {item.title || 'Northbridge Capital Notice'}
                  </h5>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#3E4652]">
                    {item.message || item.body || item.content || ''}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

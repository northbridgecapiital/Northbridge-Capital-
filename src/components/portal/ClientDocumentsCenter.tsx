import React, { useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { EmptyState, StatusTag } from '../ui/StateDisplay';
import { formatCurrency, formatDate, formatDateTime, normalizeStatusLabel } from '../../lib/formatters';
import type {
  AccountRecord,
  ClientInvestmentRecord,
  ComplianceReviewRecord,
  FinancialRequestRecord,
  LedgerEntryRecord,
  VerificationDocumentRecord,
} from '../../types/database';

function triggerDownload(filename: string, content: string, mime = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ClientDocumentsCenter({
  clientName,
  clientEmail,
  account,
  ledger,
  requests,
  clientInvestments,
  verificationDocs,
  complianceReviews,
}: {
  clientName: string;
  clientEmail: string;
  account: AccountRecord | null;
  ledger: LedgerEntryRecord[];
  requests: FinancialRequestRecord[];
  clientInvestments: ClientInvestmentRecord[];
  verificationDocs: VerificationDocumentRecord[];
  complianceReviews: ComplianceReviewRecord[];
}) {
  const [docCategoryFilter, setDocCategoryFilter] = useState<
    'all' | 'statements' | 'confirmations' | 'investments' | 'receipts' | 'verification'
  >('all');

  const currency = String(account?.currency || 'USD').toUpperCase();
  const accountNo = account?.account_number || account?.id || 'Pending Provisioning';

  const depositConfirmations = useMemo(
    () =>
      requests.filter((r) => {
        const rt = String(r.request_type || r.type || '').toLowerCase();
        const st = String(r.status || '').toLowerCase();
        return rt.includes('deposit') && (st === 'approved' || st === 'settled');
      }),
    [requests]
  );

  const withdrawalConfirmations = useMemo(
    () =>
      requests.filter((r) => {
        const rt = String(r.request_type || r.type || '').toLowerCase();
        const st = String(r.status || '').toLowerCase();
        return rt.includes('withdraw') && (st === 'approved' || st === 'settled');
      }),
    [requests]
  );

  function downloadOfficialAccountStatement() {
    const issuedAt = new Date().toISOString();
    const lines = [
      'NORTHBRIDGE CAPITAL — OFFICIAL CLIENT ACCOUNT STATEMENT',
      `Issued Date (UTC): ${issuedAt}`,
      `Client Name: ${clientName}`,
      `Client Email: ${clientEmail}`,
      `Account Number: ${accountNo}`,
      `Account Status: ${normalizeStatusLabel(account?.status || 'active')}`,
      `Currency: ${currency}`,
      `Verified Available Balance: ${formatCurrency(account?.balance ?? 0, currency)}`,
      '',
      'VERIFIED LEDGER ENTRIES:',
      'Date,Transaction ID,Category,Description,Reference,Amount,Resulting Balance',
      ...ledger.map((l) =>
        [
          formatDateTime(l.posted_at || l.created_at),
          l.transaction_uid || l.id,
          l.category || normalizeStatusLabel(l.entry_type || l.type || 'Entry'),
          `"${String(l.description || l.memo || '').replace(/"/g, '""')}"`,
          l.reference || '—',
          formatCurrency(l.amount, l.currency || currency),
          l.balance_after !== null && l.balance_after !== undefined
            ? formatCurrency(l.balance_after, l.currency || currency)
            : '—',
        ].join(',')
      ),
    ];
    triggerDownload(`northbridge-statement-${accountNo}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;');
  }

  function downloadSingleRecordReceipt(title: string, fields: [string, string][], filename: string) {
    const lines = [
      'NORTHBRIDGE CAPITAL — VERIFIED RECORD DOCUMENT',
      `Document Type: ${title}`,
      `Issuance Timestamp (UTC): ${new Date().toISOString()}`,
      `Account Holder: ${clientName} (${clientEmail})`,
      `Account Number: ${accountNo}`,
      '------------------------------------------------------------',
      ...fields.map(([k, v]) => `${k}: ${v}`),
      '------------------------------------------------------------',
      'Issued strictly from verified Northbridge Capital database records.',
    ];
    triggerDownload(filename, lines.join('\n'));
  }

  return (
    <div className="space-y-6">
      <div className="border border-[#E2E8F0] bg-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
            Authoritative Record Issuance
          </p>
          <h3 className="mt-0.5 font-serif text-xl text-[#0B1320]">
            Documents &amp; Official Statements
          </h3>
          <p className="mt-1 text-xs text-[#475569]">
            Every statement, confirmation, investment contract, and verification record is generated exclusively from verified Supabase ledger and custody records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print View</span>
          </button>
          <button
            type="button"
            onClick={downloadOfficialAccountStatement}
            className="inline-flex items-center gap-1.5 bg-[#0B1320] px-4 py-2 text-xs font-medium text-white hover:bg-[#18263D]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Full Account Statement</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All Documents'],
            ['statements', 'Account Statements'],
            ['confirmations', 'Deposit & Withdrawal Confirmations'],
            ['investments', 'Investment Agreements'],
            ['receipts', 'Transaction Receipts'],
            ['verification', 'Verification Records'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setDocCategoryFilter(key)}
            className={`border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              docCategoryFilter === key
                ? 'border-[#0B1320] bg-[#0B1320] text-white'
                : 'border-[#CBD5E1] bg-white text-[#0B1320] hover:border-[#0B1320]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Account Statement Summary Card */}
      {docCategoryFilter === 'all' || docCategoryFilter === 'statements' ? (
        <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-[#8F6F3E]" />
              <div>
                <h4 className="font-serif text-base text-[#0B1320]">
                  Official Custody Account Statement
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Account {accountNo} · Issued {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadOfficialAccountStatement}
              className="border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1320] hover:border-[#0B1320]"
            >
              Download Statement (.CSV)
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div>
              <p className="text-[#64748B]">Recorded Balance</p>
              <p className="mt-1 font-mono font-medium text-[#0B1320] tabular-nums">
                {formatCurrency(account?.balance ?? 0, currency)}
              </p>
            </div>
            <div>
              <p className="text-[#64748B]">Ledger Entries Covered</p>
              <p className="mt-1 font-mono text-[#0B1320] tabular-nums">{ledger.length} verified entries</p>
            </div>
            <div>
              <p className="text-[#64748B]">Custody Status</p>
              <div className="mt-1">
                <StatusTag status={account?.status || 'active'} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Deposit & Withdrawal Confirmations */}
      {docCategoryFilter === 'all' || docCategoryFilter === 'confirmations' ? (
        <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
          <h4 className="font-serif text-base text-[#0B1320] border-b border-[#E2E8F0] pb-3">
            Deposit &amp; Withdrawal Confirmations
          </h4>
          {depositConfirmations.length === 0 && withdrawalConfirmations.length === 0 ? (
            <EmptyState
              title="No Approved Confirmations Yet"
              description="Formal confirmations are issued here automatically once deposit or withdrawal requests are approved or settled."
            />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {[...depositConfirmations, ...withdrawalConfirmations].map((req) => (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                  <div>
                    <p className="font-medium text-[#0B1320]">
                      {normalizeStatusLabel(req.request_type || req.type || 'Confirmation')} ·{' '}
                      <span className="font-mono">{formatCurrency(req.amount, req.currency || currency)}</span>
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Issued {formatDateTime(req.reviewed_at || req.created_at)} · Ref:{' '}
                      {req.payment_reference || req.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusTag status={req.status || 'approved'} />
                    <button
                      type="button"
                      onClick={() =>
                        downloadSingleRecordReceipt(
                          `${normalizeStatusLabel(req.request_type || 'Financial')} Confirmation`,
                          [
                            ['Confirmation ID', req.id],
                            ['Status', normalizeStatusLabel(req.status || 'approved')],
                            ['Amount', formatCurrency(req.amount, req.currency || currency)],
                            ['Payment Method', req.payment_method || 'Standard Custody'],
                            ['Reference', req.payment_reference || req.payout_destination || '—'],
                            ['Reviewed Date', formatDateTime(req.reviewed_at || req.created_at)],
                            ['Administrator Note', req.admin_notes || 'Verified'],
                          ],
                          `confirmation-${req.id.slice(0, 8)}.txt`
                        )
                      }
                      className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
                    >
                      Download Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Investment Agreements & Statements */}
      {docCategoryFilter === 'all' || docCategoryFilter === 'investments' ? (
        <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
          <h4 className="font-serif text-base text-[#0B1320] border-b border-[#E2E8F0] pb-3">
            Investment Agreements &amp; Statements
          </h4>
          {clientInvestments.length === 0 ? (
            <EmptyState
              title="No Investment Agreements"
              description="Approved investment contracts and statements appear here once provisioned."
            />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {clientInvestments.map((ci) => (
                <div key={ci.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                  <div>
                    <p className="font-medium text-[#0B1320]">
                      {ci.product_name} · <span className="font-mono">{ci.reference_number}</span>
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Principal: {formatCurrency(ci.principal_amount, ci.currency)} · Recorded Earnings:{' '}
                      {formatCurrency(ci.recorded_earnings, ci.currency)} · Start: {formatDate(ci.start_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusTag status={ci.status} />
                    <button
                      type="button"
                      onClick={() =>
                        downloadSingleRecordReceipt(
                          'Investment Agreement & Statement',
                          [
                            ['Contract Reference', ci.reference_number],
                            ['Product Name', ci.product_name],
                            ['Principal Amount', formatCurrency(ci.principal_amount, ci.currency)],
                            ['Contractual Terms', ci.contractual_terms || 'As executed'],
                            ['Recorded Earnings', formatCurrency(ci.recorded_earnings, ci.currency)],
                            ['Start Date', formatDate(ci.start_date)],
                            ['Maturity Date', formatDate(ci.maturity_date)],
                            ['Status', normalizeStatusLabel(ci.status)],
                          ],
                          `investment-statement-${ci.reference_number}.txt`
                        )
                      }
                      className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
                    >
                      Download Statement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Transaction Receipts */}
      {docCategoryFilter === 'all' || docCategoryFilter === 'receipts' ? (
        <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
          <h4 className="font-serif text-base text-[#0B1320] border-b border-[#E2E8F0] pb-3">
            Verified Transaction Receipts
          </h4>
          {ledger.length === 0 ? (
            <EmptyState
              title="No Transaction Receipts"
              description="Individual downloadable receipts generate automatically for each settled ledger transaction."
            />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {ledger.slice(0, 10).map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                  <div>
                    <p className="font-medium text-[#0B1320]">
                      {l.category || l.description || 'Ledger Transaction'} ·{' '}
                      <span className="font-mono">{formatCurrency(l.amount, l.currency || currency)}</span>
                    </p>
                    <p className="font-mono text-[11px] text-[#64748B]">
                      ID: {l.transaction_uid || l.id.slice(0, 12)} · {formatDateTime(l.posted_at || l.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadSingleRecordReceipt(
                        'Verified Transaction Receipt',
                        [
                          ['Transaction ID', l.transaction_uid || l.id],
                          ['Date & Time', formatDateTime(l.posted_at || l.created_at)],
                          ['Direction', normalizeStatusLabel(l.entry_type || l.type || 'Entry')],
                          ['Category', l.category || 'Standard Custody Entry'],
                          ['Amount', formatCurrency(l.amount, l.currency || currency)],
                          ['Reference', l.reference || '—'],
                          ['Description', l.description || l.memo || '—'],
                          [
                            'Resulting Balance',
                            l.balance_after !== null && l.balance_after !== undefined
                              ? formatCurrency(l.balance_after, l.currency || currency)
                              : 'See account statement',
                          ],
                        ],
                        `receipt-${l.transaction_uid || l.id.slice(0, 8)}.txt`
                      )
                    }
                    className="border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0B1320] hover:border-[#0B1320]"
                  >
                    Download Receipt
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Verification Records */}
      {docCategoryFilter === 'all' || docCategoryFilter === 'verification' ? (
        <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
          <h4 className="font-serif text-base text-[#0B1320] border-b border-[#E2E8F0] pb-3">
            Identity &amp; Verification Records
          </h4>
          {verificationDocs.length === 0 && complianceReviews.length === 0 ? (
            <EmptyState
              title="No Verification Records"
              description="Submitted identity documents and formal compliance determinations appear here."
            />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {verificationDocs.map((doc) => (
                <div key={doc.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                  <div>
                    <p className="font-medium text-[#0B1320]">
                      {doc.document_type} · <span className="font-mono">{doc.document_reference}</span>
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Submitted {formatDateTime(doc.created_at)}
                      {doc.reviewer_notes ? ` · Note: ${doc.reviewer_notes}` : ''}
                    </p>
                  </div>
                  <StatusTag status={doc.status} />
                </div>
              ))}
              {complianceReviews.map((rev) => (
                <div key={rev.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                  <div>
                    <p className="font-medium text-[#0B1320]">{rev.review_type}</p>
                    <p className="text-[11px] text-[#64748B]">
                      Issued {formatDateTime(rev.created_at)} · {rev.notes}
                    </p>
                  </div>
                  <StatusTag status={rev.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

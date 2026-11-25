import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Search, ShieldAlert, UserCheck } from 'lucide-react';
import { AlertBanner, EmptyState, StatusTag } from '../ui/StateDisplay';
import { ConfirmDialog, type ConfirmDialogDetail } from '../ui/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { formatCurrency, formatDateTime, normalizeStatusLabel } from '../../lib/formatters';
import { invokeAdminFundAdjustment } from '../../lib/portalApi';
import type {
  AccountRecord,
  ClientInvestmentRecord,
  FinancialRequestRecord,
  FundAdjustmentCategory,
  HoldingRecord,
  LedgerEntryRecord,
  ProfileRecord,
} from '../../types/database';

const CREDIT_CATEGORIES: FundAdjustmentCategory[] = [
  'Verified deposit credit',
  'Refund',
  'Account correction',
  'Reversal',
  'Approved promotional credit',
];

const DEBIT_CATEGORIES: FundAdjustmentCategory[] = [
  'Authorized withdrawal debit',
  'Account correction',
  'Reversal',
];

const HIGH_VALUE_THRESHOLD = 25000;

export interface FundPrefillPayload {
  userId: string;
  direction: 'credit' | 'debit';
  category: FundAdjustmentCategory;
  amount: string;
  reference: string;
  description: string;
  nonce: number;
}

export function ClientFundsManagement({
  profiles,
  accounts,
  holdings,
  clientInvestments,
  requests,
  ledger,
  adminEmail,
  targetUserId,
  prefillSettlement,
  onCompleted,
}: {
  profiles: ProfileRecord[];
  accounts: AccountRecord[];
  holdings: HoldingRecord[];
  clientInvestments: ClientInvestmentRecord[];
  requests: FinancialRequestRecord[];
  ledger: LedgerEntryRecord[];
  adminEmail: string;
  targetUserId?: string | null;
  prefillSettlement?: FundPrefillPayload | null;
  onCompleted: () => Promise<void>;
}) {
  const [clientSearch, setClientSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>(targetUserId || profiles[0]?.id || '');

  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [category, setCategory] = useState<FundAdjustmentCategory>('Verified deposit credit');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const [documentedAuthChecked, setDocumentedAuthChecked] = useState(false);
  const [highValueChecked, setHighValueChecked] = useState(false);
  const [highValueNote, setHighValueNote] = useState('');

  useEffect(() => {
    if (targetUserId && profiles.some((p) => p.id === targetUserId)) {
      setSelectedUserId(targetUserId);
    } else if (!selectedUserId && profiles.length > 0) {
      setSelectedUserId(profiles[0].id);
    }
  }, [targetUserId, profiles, selectedUserId]);

  useEffect(() => {
    if (!prefillSettlement) return;
    setSelectedUserId(prefillSettlement.userId);
    setDirection(prefillSettlement.direction);
    setCategory(prefillSettlement.category);
    setAmountInput(prefillSettlement.amount);
    setReference(prefillSettlement.reference);
    setDescription(prefillSettlement.description);
    setDocumentedAuthChecked(false);
    setHighValueChecked(false);
    setHighValueNote('');
    setFeedback({
      tone: 'warning',
      title: 'Settlement Details Pre-Loaded from Financial Request',
      message: 'Verify custody bank receipt/destination and check authorization confirmation before submitting.',
    });
  }, [prefillSettlement]);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'warning';
    title?: string;
    message: string;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    details: ConfirmDialogDetail[];
  }>({ open: false, details: [] });

  const accountByUser = useMemo(() => {
    const map = new Map<string, AccountRecord>();
    accounts.forEach((a) => {
      const uid = a.user_id || a.id;
      if (uid) map.set(uid, a);
    });
    return map;
  }, [accounts]);

  const matchingClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const acc = accountByUser.get(p.id);
      return (
        String(p.full_name || '').toLowerCase().includes(q) ||
        String(p.email || '').toLowerCase().includes(q) ||
        String(acc?.account_number || '').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [profiles, accountByUser, clientSearch]);

  const selectedClient = useMemo(
    () => profiles.find((p) => p.id === selectedUserId) ?? profiles[0] ?? null,
    [profiles, selectedUserId]
  );

  const selectedAccount = useMemo(
    () => (selectedClient ? accountByUser.get(selectedClient.id) ?? null : null),
    [selectedClient, accountByUser]
  );

  const clientMetrics = useMemo(() => {
    if (!selectedClient) {
      return { available: 0, invested: 0, pendingDeposits: 0, pendingWithdrawals: 0, pendingCount: 0 };
    }
    const available = Number(selectedAccount?.balance || 0);

    const invFromContracts = clientInvestments
      .filter((ci) => ci.user_id === selectedClient.id && ci.status !== 'cancelled')
      .reduce((acc, ci) => acc + Number(ci.principal_amount || 0), 0);
    const invFromHoldings = holdings
      .filter((h) => h.user_id === selectedClient.id)
      .reduce((acc, h) => acc + Number(h.reported_value ?? h.market_value ?? h.value ?? 0), 0);
    const invested = invFromContracts + invFromHoldings;

    let pendingDeposits = 0;
    let pendingWithdrawals = 0;
    let pendingCount = 0;
    requests
      .filter((r) => r.user_id === selectedClient.id)
      .forEach((r) => {
        const st = String(r.status || 'pending').toLowerCase();
        if (st.includes('pend') || st === 'under_review' || st === 'approved') {
          pendingCount += 1;
          const rt = String(r.request_type || r.type || '').toLowerCase();
          const amt = Number(r.amount || 0);
          if (rt.includes('withdraw')) pendingWithdrawals += amt;
          else if (rt.includes('deposit')) pendingDeposits += amt;
        }
      });

    return { available, invested, pendingDeposits, pendingWithdrawals, pendingCount };
  }, [selectedClient, selectedAccount, clientInvestments, holdings, requests]);

  const selectedClientLedger = useMemo(() => {
    if (!selectedClient) return [];
    return ledger.filter(
      (entry) =>
        entry.user_id === selectedClient.id ||
        (selectedAccount && entry.account_id === selectedAccount.id)
    );
  }, [ledger, selectedClient, selectedAccount]);

  const parsedAmount = Number(amountInput);
  const isHighValue = Number.isFinite(parsedAmount) && parsedAmount >= HIGH_VALUE_THRESHOLD;
  const currency = String(selectedAccount?.currency || 'USD').toUpperCase();
  const availableCategories = direction === 'credit' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;

  function handleDirectionChange(nextDir: 'credit' | 'debit') {
    setDirection(nextDir);
    const nextList = nextDir === 'credit' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
    if (!nextList.includes(category)) {
      setCategory(nextList[0]);
    }
  }

  function handleOpenReview(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!selectedClient || !selectedAccount) {
      setFeedback({
        tone: 'error',
        message: 'Select a client with an active custody account record before posting funds.',
      });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFeedback({ tone: 'error', message: 'Enter an exact positive adjustment amount.' });
      return;
    }

    if (direction === 'debit' && parsedAmount > clientMetrics.available) {
      setFeedback({
        tone: 'error',
        message: `Debit blocked: ${formatCurrency(parsedAmount, currency)} exceeds the client's available balance of ${formatCurrency(clientMetrics.available, currency)}. Negative balances are prohibited.`,
      });
      return;
    }

    if (!description.trim() || !reference.trim()) {
      setFeedback({
        tone: 'error',
        message: 'Mandatory transaction description and settlement reference are required.',
      });
      return;
    }

    if (!documentedAuthChecked) {
      setFeedback({
        tone: 'warning',
        message: 'Confirm documented authorization and settlement reconciliation before submission.',
      });
      return;
    }

    if (isHighValue && (!highValueChecked || highValueNote.trim().length < 5)) {
      setFeedback({
        tone: 'warning',
        message: `Adjustments of ${formatCurrency(HIGH_VALUE_THRESHOLD, currency)} or greater require high-value dual-control confirmation and supervisor reference.`,
      });
      return;
    }

    const projectedAfter =
      direction === 'credit'
        ? clientMetrics.available + parsedAmount
        : clientMetrics.available - parsedAmount;

    setConfirmState({
      open: true,
      details: [
        { label: 'Client', value: `${selectedClient.full_name || 'Client'} (${selectedClient.email || selectedClient.id.slice(0, 8)})` },
        { label: 'Account Number', value: selectedAccount.account_number || selectedAccount.id.slice(0, 8) },
        { label: 'Operation', value: direction === 'credit' ? 'MANUAL CREDIT (+)' : 'AUTHORIZED DEBIT (−)' },
        { label: 'Category', value: category },
        { label: 'Exact Amount', value: formatCurrency(parsedAmount, currency) },
        { label: 'Balance Before', value: formatCurrency(clientMetrics.available, currency) },
        { label: 'Resulting Balance After', value: formatCurrency(projectedAfter, currency) },
        { label: 'Settlement Reference', value: reference.trim() },
        { label: 'High-Value Control', value: isHighValue ? `Verified (${highValueNote.trim()})` : 'Standard threshold' },
        { label: 'Client Notification', value: notifyClient ? 'Dispatch automated alert' : 'Silent ledger entry' },
        { label: 'Authorizing Admin', value: adminEmail },
      ],
    });
  }

  async function handleExecuteAdjustment() {
    if (!selectedClient || !selectedAccount) return;
    setSubmitting(true);
    const fullDescription = isHighValue
      ? `${description.trim()} [HV Auth: ${highValueNote.trim()}]`
      : description.trim();

    const res = await invokeAdminFundAdjustment({
      userId: selectedClient.id,
      accountId: selectedAccount.id,
      direction,
      category,
      amount: parsedAmount,
      currency,
      description: fullDescription,
      reference: reference.trim(),
      highValueAuthorized: isHighValue ? highValueChecked : true,
      notifyClient,
    });
    setSubmitting(false);
    setConfirmState({ open: false, details: [] });

    if (res.error) {
      setFeedback({
        tone: res.rpcMissing ? 'warning' : 'error',
        title: 'Adjustment Not Executed',
        message: res.error,
      });
      return;
    }

    const txnId = res.data?.transaction_uid || reference.trim();
    const afterVal =
      typeof res.data?.balance_after === 'number'
        ? formatCurrency(res.data.balance_after, currency)
        : formatCurrency(
            direction === 'credit'
              ? clientMetrics.available + parsedAmount
              : clientMetrics.available - parsedAmount,
            currency
          );

    setFeedback({
      tone: 'success',
      title: `Transaction Posted · ID ${txnId}`,
      message: `${category} of ${formatCurrency(parsedAmount, currency)} recorded atomically. Resulting available balance: ${afterVal}. ${notifyClient ? 'Client notification dispatched.' : ''}`,
    });

    setAmountInput('');
    setDescription('');
    setReference('');
    setDocumentedAuthChecked(false);
    setHighValueChecked(false);
    setHighValueNote('');
    await onCompleted();
  }

  const clientLedgerColumns: DataTableColumn<LedgerEntryRecord>[] = [
    {
      key: 'date',
      header: 'Posted At',
      sortValue: (l) => String(l.created_at || l.posted_at || ''),
      render: (l) => (
        <span className="font-mono text-[#475569] tabular-nums">
          {formatDateTime(l.created_at || l.posted_at)}
        </span>
      ),
    },
    {
      key: 'txn',
      header: 'Transaction ID & Ref',
      render: (l) => (
        <div>
          <p className="font-mono font-medium text-[#0B1320]">
            {l.transaction_uid || l.id.slice(0, 12).toUpperCase()}
          </p>
          <p className="font-mono text-[11px] text-[#64748B]">{l.reference || '—'}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category & Description',
      render: (l) => (
        <div>
          <p className="font-medium text-[#0B1320]">
            {l.category || normalizeStatusLabel(l.entry_type || l.type || 'Ledger Entry')}
          </p>
          <p className="max-w-xs truncate text-[11px] text-[#475569]">
            {l.description || l.memo || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (l) => <StatusTag status={l.entry_type || l.type || 'recorded'} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (l) => Number(l.amount || 0),
      render: (l) => (
        <span className="font-mono font-medium text-[#0B1320] tabular-nums">
          {formatCurrency(l.amount, l.currency || currency)}
        </span>
      ),
    },
    {
      key: 'balances',
      header: 'Before → After',
      align: 'right',
      render: (l) =>
        l.balance_after !== null && l.balance_after !== undefined ? (
          <div className="font-mono text-[11px] tabular-nums">
            <span className="text-[#64748B]">
              {formatCurrency(l.balance_before ?? 0, l.currency || currency)} →{' '}
            </span>
            <span className="font-semibold text-[#0B1320]">
              {formatCurrency(l.balance_after, l.currency || currency)}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[#64748B]">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={confirmState.open}
        title="Review & Authorize Client Funds Adjustment"
        description="This commits an immutable financial ledger entry, updates the client's available balance atomically, writes an audit log entry, and optionally notifies the client."
        confirmLabel={direction === 'credit' ? 'Post Credit Adjustment' : 'Post Debit Adjustment'}
        tone={direction === 'debit' ? 'danger' : 'primary'}
        details={confirmState.details}
        busy={submitting}
        onConfirm={handleExecuteAdjustment}
        onCancel={() => {
          if (!submitting) setConfirmState({ open: false, details: [] });
        }}
      />

      <AlertBanner
        tone="info"
        title="Custody Accounting Safeguards Active"
        message="Manual adjustments require Super Admin or Finance Admin verification, settlement reconciliation reference, non-negative balance enforcement, and permanent before-and-after ledger audit logging."
      />

      {feedback ? (
        <AlertBanner
          tone={feedback.tone}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Client Search & Selector */}
        <div className="lg:col-span-4 border border-[#E2E8F0] bg-white p-5 space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
              Step 1 · Select Client
            </p>
            <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">Registered Accounts</h3>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search name, email, or account..."
              className="w-full border border-[#CBD5E1] bg-white pl-8 pr-3 py-2 text-xs text-[#0B1320] focus:border-[#0B1320] focus:outline-none"
            />
          </div>

          {matchingClients.length === 0 ? (
            <p className="py-4 text-xs text-[#64748B]">No clients match your search query.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] max-h-[520px] overflow-y-auto">
              {matchingClients.map((p) => {
                const acc = accountByUser.get(p.id);
                const active = selectedClient?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(p.id);
                      setFeedback(null);
                    }}
                    className={`w-full p-3.5 text-left transition-colors ${
                      active ? 'bg-[#0B1320] text-white' : 'hover:bg-[#F8FAFC] text-[#0B1320]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium">{p.full_name || 'Client'}</p>
                      <span className="font-mono text-[11px] tabular-nums shrink-0 opacity-90">
                        {acc ? formatCurrency(acc.balance, acc.currency || 'USD') : 'No Acct'}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] opacity-75">
                      {p.email || p.id.slice(0, 8)} · {acc?.account_number || 'Unprovisioned'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Account Telemetry & Adjustment Form */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedClient ? (
            <EmptyState
              title="No Client Selected"
              description="Select a registered client from the directory to open their financial custody account."
            />
          ) : (
            <>
              {/* Client Account Snapshot */}
              <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                      Step 2 · Client Custody Snapshot
                    </p>
                    <h3 className="mt-0.5 font-serif text-xl text-[#0B1320]">
                      {selectedClient.full_name || 'Client Account'}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {selectedClient.email} · Account:{' '}
                      <span className="font-mono text-[#0B1320]">
                        {selectedAccount?.account_number || 'Not Provisioned'}
                      </span>
                    </p>
                  </div>
                  <StatusTag status={selectedAccount?.status || 'no_account'} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-[11px] text-[#64748B]">Available Balance</p>
                    <p className="mt-1 font-mono text-lg font-medium text-[#0B1320] tabular-nums">
                      {selectedAccount ? formatCurrency(clientMetrics.available, currency) : '—'}
                    </p>
                  </div>
                  <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-[11px] text-[#64748B]">Invested Capital</p>
                    <p className="mt-1 font-mono text-lg font-medium text-[#0B1320] tabular-nums">
                      {formatCurrency(clientMetrics.invested, currency)}
                    </p>
                  </div>
                  <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-[11px] text-[#64748B]">Pending Deposits</p>
                    <p className="mt-1 font-mono text-base font-medium text-[#166534] tabular-nums">
                      {formatCurrency(clientMetrics.pendingDeposits, currency)}
                    </p>
                  </div>
                  <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-[11px] text-[#64748B]">Pending Withdrawals</p>
                    <p className="mt-1 font-mono text-base font-medium text-[#92400E] tabular-nums">
                      {formatCurrency(clientMetrics.pendingWithdrawals, currency)}{' '}
                      <span className="text-[11px] text-[#64748B]">({clientMetrics.pendingCount} open)</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Execution Form */}
              {!selectedAccount ? (
                <AlertBanner
                  tone="warning"
                  title="Custody Account Required"
                  message="Provision a custody account for this client inside Client Directory before executing ledger credits or debits."
                />
              ) : (
                <form onSubmit={handleOpenReview} className="border border-[#E2E8F0] bg-white p-6 space-y-5">
                  <div className="border-b border-[#E2E8F0] pb-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
                      Step 3 · Manual Credit, Debit or Correction
                    </p>
                    <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
                      Atomic Ledger &amp; Balance Adjustment
                    </h3>
                  </div>

                  {/* Direction Tabs */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleDirectionChange('credit')}
                      className={`border py-2.5 px-4 text-xs font-medium transition-colors ${
                        direction === 'credit'
                          ? 'border-[#0B1320] bg-[#0B1320] text-white'
                          : 'border-[#CBD5E1] bg-white text-[#0B1320] hover:border-[#0B1320]'
                      }`}
                    >
                      Manual Account Credit (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDirectionChange('debit')}
                      className={`border py-2.5 px-4 text-xs font-medium transition-colors ${
                        direction === 'debit'
                          ? 'border-[#991B1B] bg-[#991B1B] text-white'
                          : 'border-[#CBD5E1] bg-white text-[#0B1320] hover:border-[#991B1B]'
                      }`}
                    >
                      Authorized Debit / Correction (−)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="cfm-category" className="block text-xs font-medium text-[#334155]">
                        Transaction Category *
                      </label>
                      <select
                        id="cfm-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as FundAdjustmentCategory)}
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                      >
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cfm-amount" className="block text-xs font-medium text-[#334155]">
                        Exact Amount ({currency}) *
                      </label>
                      <input
                        id="cfm-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                    </div>

                    <div>
                      <label htmlFor="cfm-reference" className="block text-xs font-medium text-[#334155]">
                        Settlement / Bank Reference *
                      </label>
                      <input
                        id="cfm-reference"
                        type="text"
                        required
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. WIRE-2026-88412"
                        className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cfm-description" className="block text-xs font-medium text-[#334155]">
                      Mandatory Transaction Description *
                    </label>
                    <input
                      id="cfm-description"
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Clear description visible on client statement & ledger (e.g. Verified SWIFT wire settlement reconciled against bank statement)"
                      className="mt-1 w-full border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0B1320]"
                    />
                  </div>

                  {isHighValue ? (
                    <div className="border border-[#92400E]/30 bg-[#FFFBEB] p-4 space-y-3">
                      <div className="flex items-start gap-2.5 text-xs text-[#78350F]">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            High-Value Dual Authorization Required (&ge; {formatCurrency(HIGH_VALUE_THRESHOLD, currency)})
                          </p>
                          <p className="mt-0.5">
                            Enter secondary supervisor approval reference and confirm sign-off before submitting.
                          </p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={highValueNote}
                        onChange={(e) => setHighValueNote(e.target.value)}
                        placeholder="Secondary authorization / compliance approval code (required)"
                        className="w-full border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-xs text-[#0B1320]"
                      />
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-[#78350F] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={highValueChecked}
                          onChange={(e) => setHighValueChecked(e.target.checked)}
                          className="h-4 w-4 accent-[#92400E]"
                        />
                        <span>Confirm high-value dual-control approval has been verified.</span>
                      </label>
                    </div>
                  ) : null}

                  <div className="space-y-2.5 border-t border-[#E2E8F0] pt-4 text-xs text-[#334155]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyClient}
                        onChange={(e) => setNotifyClient(e.target.checked)}
                        className="h-4 w-4 accent-[#0B1320]"
                      />
                      <span>Send automated transaction notification to client Notification Center</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={documentedAuthChecked}
                        onChange={(e) => setDocumentedAuthChecked(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#0B1320]"
                      />
                      <span>
                        I verify this transaction matches actual payment settlement or authorized accounting records, preserves immutable history, and records my administrator identity ({adminEmail}).
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-2 text-xs text-[#64748B]">
                      <UserCheck className="h-4 w-4 text-[#8F6F3E]" />
                      <span>Executed by: {adminEmail}</span>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 bg-[#0B1320] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#18263D] disabled:opacity-50"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Review Before Submission</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Selected Client's Immutable Ledger History */}
      {selectedClient ? (
        <div className="border border-[#E2E8F0] bg-white p-6 space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
              Immutable Ledger Verification
            </p>
            <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
              {selectedClient.full_name || selectedClient.email} — Transaction &amp; Balance History
            </h3>
          </div>
          <DataTable
            rows={selectedClientLedger}
            columns={clientLedgerColumns}
            rowKey={(l) => l.id}
            emptyTitle="No Ledger Entries"
            emptyDescription="Executed fund adjustments and verified settlements for this client will appear here with unique transaction IDs and before/after balances."
          />
        </div>
      ) : null}
    </div>
  );
}

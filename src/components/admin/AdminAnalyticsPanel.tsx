import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../ui/StateDisplay';
import { formatCurrency, normalizeStatusLabel } from '../../lib/formatters';
import type {
  AccountRecord,
  FinancialRequestRecord,
  HoldingRecord,
  LedgerEntryRecord,
} from '../../types/database';

const CHART_COLORS = ['#0B1320', '#8F6F3E', '#1E3A5F', '#475569', '#B08D57', '#64748B'];

export function AdminOverviewAnalytics({
  accounts,
  requests,
  ledger,
}: {
  accounts: AccountRecord[];
  requests: FinancialRequestRecord[];
  ledger: LedgerEntryRecord[];
}) {
  const accountStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    accounts.forEach((acc) => {
      const key = normalizeStatusLabel(acc.status || 'active');
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [accounts]);

  const requestStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    requests.forEach((req) => {
      const key = normalizeStatusLabel(req.status || 'pending');
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [requests]);

  const currencyTotals = useMemo(() => {
    const totals = new Map<string, { recorded: number; credits: number; debits: number; accounts: number }>();
    accounts.forEach((acc) => {
      const cur = String(acc.currency || 'USD').toUpperCase();
      const entry = totals.get(cur) || { recorded: 0, credits: 0, debits: 0, accounts: 0 };
      entry.recorded += Number(acc.balance || 0);
      entry.accounts += 1;
      totals.set(cur, entry);
    });
    ledger.forEach((item) => {
      const cur = String(item.currency || 'USD').toUpperCase();
      const entry = totals.get(cur) || { recorded: 0, credits: 0, debits: 0, accounts: 0 };
      const amt = Math.abs(Number(item.amount || 0));
      const kind = String(item.entry_type || item.type || '').toLowerCase();
      if (kind.includes('debit') || kind.includes('withdraw')) {
        entry.debits += amt;
      } else {
        entry.credits += amt;
      }
      totals.set(cur, entry);
    });
    return Array.from(totals.entries()).map(([currency, stats]) => ({
      currency,
      ...stats,
    }));
  }, [accounts, ledger]);

  return (
    <div className="space-y-4">
      {currencyTotals.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {currencyTotals.map((row) => (
            <div key={row.currency} className="border border-[#E2E8F0] bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                  {row.currency} Recorded Custody
                </p>
                <span className="font-mono text-xs text-[#8F6F3E]">{row.accounts} accts</span>
              </div>
              <p className="mt-2 font-mono text-xl font-medium text-[#0B1320] tabular-nums">
                {formatCurrency(row.recorded, row.currency)}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-[#F1F5F9] pt-2.5 text-[11px] text-[#475569] tabular-nums">
                <span>Credits: {formatCurrency(row.credits, row.currency)}</span>
                <span>Debits: {formatCurrency(row.debits, row.currency)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border border-[#E2E8F0] bg-white p-6">
          <div className="border-b border-[#E2E8F0] pb-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
              Custody Status Telemetry
            </p>
            <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
              Client Accounts by Operational Status
            </h3>
          </div>
          {accountStatusData.length === 0 ? (
            <div className="pt-4">
              <EmptyState
                title="No Account Records"
                description="Live status analytics will populate automatically once client accounts exist in Supabase."
              />
            </div>
          ) : (
            <div className="mt-4 h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accountStatusData} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#CBD5E1' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1320',
                      border: 'none',
                      color: '#FCFBF8',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Accounts" radius={[2, 2, 0, 0]}>
                    {accountStatusData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="border border-[#E2E8F0] bg-white p-6">
          <div className="border-b border-[#E2E8F0] pb-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
              Request Pipeline
            </p>
            <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
              Financial Requests by Review Stage
            </h3>
          </div>
          {requestStatusData.length === 0 ? (
            <div className="pt-4">
              <EmptyState
                title="No Financial Requests"
                description="Submitted deposit and withdrawal requests from clients will render here dynamically."
              />
            </div>
          ) : (
            <div className="mt-4 h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestStatusData} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#CBD5E1' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1320',
                      border: 'none',
                      color: '#FCFBF8',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Requests" radius={[2, 2, 0, 0]}>
                    {requestStatusData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[(idx + 1) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminHoldingsAnalytics({ holdings }: { holdings: HoldingRecord[] }) {
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { category: string; count: number; totalValue: number }>();
    holdings.forEach((h) => {
      const cat = String(h.asset_category || h.category || 'Unclassified').trim();
      const val = Number(h.reported_value ?? h.market_value ?? h.value ?? 0);
      const existing = map.get(cat) || { category: cat, count: 0, totalValue: 0 };
      existing.count += 1;
      existing.totalValue += Number.isFinite(val) ? val : 0;
      map.set(cat, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [holdings]);

  if (categoryBreakdown.length === 0) {
    return (
      <EmptyState
        title="No Recorded Holdings"
        description="Allocation charts appear automatically when client positions exist in public.holdings."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 border border-[#E2E8F0] bg-white p-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
          Asset Class Mix
        </p>
        <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
          Recorded Holdings by Asset Category
        </h3>
        <div className="mt-4 h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryBreakdown}
                dataKey="count"
                nameKey="category"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
              >
                {categoryBreakdown.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1320',
                  border: 'none',
                  color: '#FCFBF8',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-3">
          Category Distribution (Live Supabase Totals)
        </p>
        <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
          {categoryBreakdown.map((item, idx) => (
            <div key={item.category} className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0"
                  style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="truncate font-medium text-[#0B1320]">{item.category}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums text-[#334155]">
                <span>{item.count} pos.</span>
                <span>{item.totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
import { formatCurrency, formatDate } from '../../lib/formatters';
import type {
  ClientInvestmentRecord,
  HoldingRecord,
  LedgerEntryRecord,
} from '../../types/database';

const CHART_COLORS = ['#0B1320', '#8F6F3E', '#1E3A5F', '#475569', '#B08D57', '#64748B'];

export function ClientAnalyticsCharts({
  ledger,
  holdings,
  clientInvestments,
  currency,
}: {
  ledger: LedgerEntryRecord[];
  holdings: HoldingRecord[];
  clientInvestments: ClientInvestmentRecord[];
  currency: string;
}) {
  const activitySeries = useMemo(() => {
    const byDate = new Map<string, { label: string; credits: number; debits: number }>();
    const ordered = [...ledger].reverse().slice(-20);
    ordered.forEach((entry) => {
      const label = formatDate(entry.posted_at || entry.created_at);
      const bucket = byDate.get(label) || { label, credits: 0, debits: 0 };
      const amt = Math.abs(Number(entry.amount || 0));
      const kind = String(entry.entry_type || entry.type || '').toLowerCase();
      if (kind.includes('debit') || kind.includes('withdraw')) {
        bucket.debits += amt;
      } else {
        bucket.credits += amt;
      }
      byDate.set(label, bucket);
    });
    return Array.from(byDate.values());
  }, [ledger]);

  const allocationSeries = useMemo(() => {
    const map = new Map<string, number>();
    clientInvestments
      .filter((ci) => ci.status !== 'cancelled')
      .forEach((ci) => {
        const val = Number(ci.principal_amount || 0);
        if (val > 0) {
          map.set(ci.product_name, (map.get(ci.product_name) || 0) + val);
        }
      });
    holdings.forEach((h) => {
      const val = Number(h.reported_value ?? h.market_value ?? h.value ?? 0);
      const cat = String(h.asset_category || h.category || 'Custody Asset');
      if (val > 0) {
        map.set(cat, (map.get(cat) || 0) + val);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [holdings, clientInvestments]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7 border border-[#E2E8F0] bg-white p-6">
        <div className="border-b border-[#E2E8F0] pb-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
            Account Ledger Activity
          </p>
          <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
            Verified Credits &amp; Debits Timeline
          </h3>
        </div>
        {activitySeries.length === 0 ? (
          <div className="pt-4">
            <EmptyState
              title="No Ledger Activity Yet"
              description="Verified deposits, withdrawals, investment allocations, and authorized adjustments appear here automatically."
            />
          </div>
        ) : (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activitySeries} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v), currency)}
                  contentStyle={{
                    backgroundColor: '#0B1320',
                    border: 'none',
                    color: '#FCFBF8',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="credits" name="Credits" fill="#0B1320" radius={[2, 2, 0, 0]} />
                <Bar dataKey="debits" name="Debits" fill="#8F6F3E" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="lg:col-span-5 border border-[#E2E8F0] bg-white p-6">
        <div className="border-b border-[#E2E8F0] pb-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8F6F3E]">
            Capital Allocation
          </p>
          <h3 className="mt-0.5 font-serif text-lg text-[#0B1320]">
            Investment Portfolio Breakdown
          </h3>
        </div>
        {allocationSeries.length === 0 ? (
          <div className="pt-4">
            <EmptyState
              title="No Active Investments"
              description="Active portfolio holdings and approved investment positions will render here."
            />
          </div>
        ) : (
          <div className="mt-4">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationSeries}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {allocationSeries.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(Number(val), currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2 border-t border-[#E2E8F0] pt-3">
              {allocationSeries.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-[#0B1320] truncate">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[#334155] shrink-0">
                    {formatCurrency(item.value, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

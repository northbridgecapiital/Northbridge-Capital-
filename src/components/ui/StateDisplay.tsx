import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Info, Landmark, ShieldAlert, XCircle } from 'lucide-react';
import { normalizeStatusLabel } from '../../lib/formatters';
import { supabaseConfigError } from '../../lib/supabase';

export function StatusTag({ status }: { status: string | null | undefined }) {
  const raw = (status || 'recorded').toLowerCase();
  const label = normalizeStatusLabel(status);

  if (raw === 'inactive' || raw.includes('inactive') || raw === 'archived') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3E4652]">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (
    raw.includes('approv') ||
    raw.includes('active') ||
    raw.includes('complet') ||
    raw.includes('settl') ||
    raw.includes('verified') ||
    raw.includes('answered') ||
    raw.includes('resolv') ||
    raw.includes('contacted') ||
    raw.includes('cleared') ||
    raw.includes('credit')
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#166534]">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (raw.includes('pend') || raw.includes('review') || raw.includes('open')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#92400E]">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (
    raw.includes('reject') ||
    raw.includes('declin') ||
    raw.includes('suspend') ||
    raw.includes('restrict') ||
    raw.includes('debit') ||
    raw.includes('closed')
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#991B1B]">
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3E4652]">
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full animate-pulse space-y-3 py-2" aria-busy="true" aria-label="Loading data">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="grid gap-4 py-2 border-b border-[#EAE6DD]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, cIdx) => (
            <div key={cIdx} className="h-4 rounded bg-[#EAE6DD]" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-[#EAE6DD] bg-[#FCFBF8] px-6 py-10 text-center">
      <p className="font-serif text-lg text-[#111C2E]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#3E4652]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AlertBanner({
  tone,
  title,
  message,
  onDismiss,
}: {
  tone: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    error: 'border-[#991B1B]/25 bg-[#FEF2F2] text-[#7F1D1D]',
    warning: 'border-[#92400E]/25 bg-[#FFFBEB] text-[#78350F]',
    success: 'border-[#166534]/25 bg-[#F0FDF4] text-[#14532D]',
    info: 'border-[#D8D1C4] bg-[#FCFBF8] text-[#111C2E]',
  }[tone];

  const Icon = tone === 'error' ? ShieldAlert : tone === 'warning' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info;

  return (
    <div role="alert" className={`border px-4 py-3 text-sm ${styles}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            {title ? <p className="font-medium">{title}</p> : null}
            <p className={title ? 'mt-0.5 text-xs leading-relaxed opacity-90' : 'leading-relaxed'}>{message}</p>
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-medium underline underline-offset-2 hover:opacity-75 whitespace-nowrap shrink-0"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SupabaseConfigNotice() {
  const detail =
    supabaseConfigError ||
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment configuration and rebuild to enable authentication and database access.';

  return (
    <AlertBanner
      tone="warning"
      title="Supabase Environment Configuration Required"
      message={detail}
    />
  );
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle = 'Northbridge Capital',
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1320] via-[#111C2E] to-[#18263D] p-8 text-[#F7F5F0] ${className}`}
        role="img"
        aria-label={alt}
      >
        <Landmark className="h-8 w-8 text-[#C6A46E] mb-3" aria-hidden="true" />
        <p className="font-serif text-lg tracking-wide">{fallbackTitle}</p>
        <p className="mt-1 text-xs text-[#D8D1C4]/80">London · Zurich</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

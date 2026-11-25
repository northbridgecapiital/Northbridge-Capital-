import React, { useEffect } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

export interface ConfirmDialogDetail {
  label: string;
  value: string;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  tone = 'primary',
  details,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  details?: ConfirmDialogDetail[];
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        onCancel();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1320]/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="w-full max-w-lg border border-[#CBD5E1] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border ${
                tone === 'danger'
                  ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                  : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0B1320]'
              }`}
            >
              {tone === 'danger' ? (
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-[#8F6F3E]" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                Confirmation Required
              </p>
              <h3 id="confirm-dialog-title" className="mt-0.5 font-serif text-lg font-medium text-[#0B1320]">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="inline-flex h-8 w-8 items-center justify-center text-[#64748B] hover:text-[#0B1320] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-[#334155]">{description}</p>

          {details && details.length > 0 ? (
            <dl className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] bg-[#F8FAFC]">
              {details.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 px-3.5 py-2 text-xs">
                  <dt className="font-medium text-[#64748B]">{item.label}</dt>
                  <dd className="text-right font-mono text-[#0B1320] break-all">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3.5">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-[#1E293B] hover:border-[#0B1320] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className={`px-4 py-2 text-xs font-medium text-white disabled:opacity-50 ${
              tone === 'danger'
                ? 'bg-[#991B1B] hover:bg-[#7F1D1D]'
                : 'bg-[#0B1320] hover:bg-[#18263D]'
            }`}
          >
            {busy ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

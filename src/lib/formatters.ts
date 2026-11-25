export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string | null | undefined = 'USD'
): string {
  if (amount === null || amount === undefined || amount === '') {
    return '—';
  }
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  const safeCurrency = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${safeCurrency} ${numeric.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function formatNumber(value: number | string | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  return numeric.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function normalizeStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Recorded';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

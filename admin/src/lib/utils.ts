import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrency = (
  amount: number,
  currency = 'EUR',
  locale = 'fr-FR',
) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

export const formatNumber = (n: number, locale = 'fr-FR') =>
  new Intl.NumberFormat(locale).format(n);

export const formatDate = (
  iso: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
  locale = 'fr-FR',
) => {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, opts).format(d);
};

export const initials = (label: string | null | undefined) => {
  if (!label) return '?';
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return label.slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
};

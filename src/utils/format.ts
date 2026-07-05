import { Currency, CURRENCIES } from '../db/database';

export function formatCurrency(amount: number, currency: Currency): string {
  const c = CURRENCIES.find((x) => x.code === currency);
  const symbol = c?.symbol || '';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${symbol}`;
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end };
}

export function isSameDay(date: string | Date, ref: Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function isSameMonth(date: string | Date, ref: Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function isSameYear(date: string | Date, ref: Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear() === ref.getFullYear();
}

export function getMonthName(month: number): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];
  return months[month] || '';
}

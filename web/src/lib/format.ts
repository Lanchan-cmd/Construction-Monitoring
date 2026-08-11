import type { Language } from "@/lib/types";

/**
 * Format a number as Indian rupees (₹) with Indian digit grouping.
 * Example: 1250000 → "₹12,50,000.00"
 */
export function formatINR(amount: number, lang: Language = "en"): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted;
}

/** Compact ₹ format for cards/tight spaces: ₹12.5L, ₹1.2Cr. */
export function formatINRCompact(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

/** Format a date string (YYYY-MM-DD or ISO) for display. */
export function formatDate(dateStr: string | null, lang: Language = "en"): string {
  if (!dateStr) return "—";
  const locale = lang === "kn" ? "kn-IN" : "en-IN";
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a datetime string for display with time. */
export function formatDateTime(dateStr: string, lang: Language = "en"): string {
  const locale = lang === "kn" ? "kn-IN" : "en-IN";
  return new Date(dateStr).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Get today's date as YYYY-MM-DD (for date inputs and queries). */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

/** Calculate days between two dates. */
export function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Calculate GST amount given base amount and GST percent. */
export function calcGST(amount: number, gstPercent: number): number {
  return (amount * gstPercent) / 100;
}

/** Calculate total with GST. */
export function calcTotalWithGST(amount: number, gstPercent: number): number {
  return amount + calcGST(amount, gstPercent);
}

/** Calculate wage for a day given status (present=full, half_day=0.5, absent/leave=0). */
export function calcDailyWage(dailyWage: number, status: string, overtimeHours = 0): number {
  const multiplier = status === "present" ? 1 : status === "half_day" ? 0.5 : 0;
  const overtimePay = overtimeHours * (dailyWage / 8) * 1.5; // 1.5x hourly rate
  return dailyWage * multiplier + overtimePay;
}

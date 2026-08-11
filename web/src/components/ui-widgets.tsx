import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: "amber" | "blue" | "green" | "red" | "purple" | "slate";
  loading?: boolean;
}

const ACCENT_STYLES: Record<NonNullable<StatCardProps["accent"]>, string> = {
  amber:  "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  blue:   "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  green:  "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  red:    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  slate:  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function StatCard({ label, value, icon: Icon, hint, accent = "amber", loading }: StatCardProps) {
  return (
    <Card className="overflow-hidden rounded-card shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", ACCENT_STYLES[accent])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-28" />
          ) : (
            <p className="text-2xl font-bold tracking-tight animate-slide-up">{value}</p>
          )}
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-card shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  planning:          { dot: "bg-slate-400",    text: "text-slate-700 dark:text-slate-300",    bg: "bg-slate-100 dark:bg-slate-800/60" },
  active:            { dot: "bg-emerald-500",  text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  on_hold:           { dot: "bg-amber-500",    text: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/30" },
  completed:         { dot: "bg-blue-500",     text: "text-blue-700 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-900/30" },
  cancelled:         { dot: "bg-red-500",      text: "text-red-700 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-900/30" },
  pending:           { dot: "bg-amber-500",    text: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/30" },
  approved:          { dot: "bg-emerald-500",  text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  rejected:          { dot: "bg-red-500",      text: "text-red-700 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-900/30" },
  fulfilled:         { dot: "bg-blue-500",     text: "text-blue-700 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-900/30" },
  todo:              { dot: "bg-slate-400",    text: "text-slate-700 dark:text-slate-300",    bg: "bg-slate-100 dark:bg-slate-800/60" },
  in_progress:       { dot: "bg-blue-500",     text: "text-blue-700 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-900/30" },
  review:            { dot: "bg-purple-500",   text: "text-purple-700 dark:text-purple-400",  bg: "bg-purple-50 dark:bg-purple-900/30" },
  done:              { dot: "bg-emerald-500",  text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  open:              { dot: "bg-red-500",      text: "text-red-700 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-900/30" },
  resolved:          { dot: "bg-emerald-500",  text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  closed:            { dot: "bg-slate-400",    text: "text-slate-700 dark:text-slate-300",    bg: "bg-slate-100 dark:bg-slate-800/60" },
  present:           { dot: "bg-emerald-500",  text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  absent:            { dot: "bg-red-500",      text: "text-red-700 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-900/30" },
  half_day:          { dot: "bg-amber-500",    text: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/30" },
  leave:             { dot: "bg-slate-400",    text: "text-slate-700 dark:text-slate-300",    bg: "bg-slate-100 dark:bg-slate-800/60" },
  paid:              { dot: "bg-emerald-500",  text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  partial:           { dot: "bg-amber-500",    text: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/30" },
  available:         { dot: "bg-emerald-500",  text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  in_use:            { dot: "bg-blue-500",     text: "text-blue-700 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-900/30" },
  under_maintenance: { dot: "bg-amber-500",    text: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/30" },
  retired:           { dot: "bg-slate-400",    text: "text-slate-700 dark:text-slate-300",    bg: "bg-slate-100 dark:bg-slate-800/60" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cfg = STATUS_CONFIG[status] ?? { dot: "bg-slate-400", text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800/60" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cfg.bg, cfg.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  low:      { dot: "bg-slate-400",   text: "text-slate-600 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800/60" },
  medium:   { dot: "bg-blue-500",    text: "text-blue-700 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-900/30" },
  high:     { dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/30" },
  critical: { dot: "bg-red-500",     text: "text-red-700 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/30" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.low;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cfg.bg, cfg.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {priority}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const gradient =
    pct >= 75 ? "from-emerald-400 to-emerald-500" :
    pct >= 50 ? "from-amber-400 to-amber-500" :
    pct >= 25 ? "from-orange-400 to-orange-500" :
                "from-red-400 to-red-500";
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", gradient)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-16 text-center animate-fade-in">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-base font-semibold tracking-tight">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-sm text-muted-foreground leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" style={{ maxWidth: j === 0 ? "40%" : undefined }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

export function PageHeader({ title, description, action }: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

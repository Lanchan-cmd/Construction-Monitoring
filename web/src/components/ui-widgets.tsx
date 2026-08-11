import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: "amber" | "blue" | "green" | "red" | "purple" | "slate";
  loading?: boolean;
}

const ACCENT_STYLES: Record<NonNullable<StatCardProps["accent"]>, string> = {
  amber: "bg-primary/10 text-primary",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

/** Dashboard stat card with icon, label, value, and optional hint. */
export function StatCard({ label, value, icon: Icon, hint, accent = "amber", loading }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", ACCENT_STYLES[accent])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-24" />
          ) : (
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          )}
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Status pill with color mapping for construction statuses. */
const STATUS_STYLES: Record<string, string> = {
  // Project
  planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  // Request
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  fulfilled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  // Task
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  review: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  // Issue
  open: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  // Attendance
  present: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  absent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  half_day: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  leave: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  // Payment
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  // Equipment
  available: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  in_use: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  under_maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  retired: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

/** Priority badge for tasks/issues. */
const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
  high: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  critical: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground")}>
      {priority}
    </span>
  );
}

/** Progress bar showing percentage with color coding. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const color = value >= 75 ? "bg-green-500" : value >= 50 ? "bg-primary" : value >= 25 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/** Empty state placeholder. */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Page header with title, description, and optional action button. */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

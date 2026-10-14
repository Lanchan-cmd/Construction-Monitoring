import { useQuery } from "@tanstack/react-query";
import {
  Building2, HardHat, IndianRupee, AlertTriangle, ListTodo,
  Package, Users, TrendingUp, CheckSquare, UserCheck, Banknote,
  ClipboardList, ArrowRight,
} from "lucide-react";
import { GradientBarChart, GradientAreaChart, DonutChart } from "@/components/charts";
import { supabase } from "@/lib/supabase";
import { useAuth, usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatINRCompact } from "@/lib/format";
import { StatCard, StatusBadge, ProgressBar, EmptyState, PageHeader } from "@/components/ui-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Shared data hooks ───────────────────────────────────────────────────────

/**
 * Fetch projects scoped to the current user's role.
 * Admin → all projects. Engineer/Contractor/Owner → only their assigned projects.
 */
function useProjects(profile: Profile) {
  return useQuery({
    queryKey: ["projects", profile.role, profile.id],
    queryFn: async () => {
      let query = supabase.from("projects").select("*").order("created_at", { ascending: false });

      if (profile.role === "engineer") {
        query = query.eq("engineer_id", profile.id);
      } else if (profile.role === "contractor") {
        query = query.eq("contractor_id", profile.id);
      } else if (profile.role === "owner") {
        query = query.eq("created_by", profile.id);
      }
      // admin: no filter — sees everything

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Fetch dashboard counts scoped to specific project IDs.
 * Pass `null` for projectIds to fetch system-wide (admin only).
 * Pass an empty array to short-circuit and return all zeros (no projects assigned).
 */
function useDashStats(projectIds: string[] | null) {
  return useQuery({
    queryKey: ["dashboard-stats", projectIds],
    queryFn: async () => {
      // Short-circuit: user has no assigned projects
      if (projectIds !== null && projectIds.length === 0) {
        return {
          workers: 0, openIssues: 0, pendingTasks: 0, pendingRequests: 0,
          totalUsers: 0, totalExpenses: 0, presentToday: 0, pendingPayments: 0,
        };
      }

      const today = new Date().toISOString().slice(0, 10);
      const scoped = projectIds !== null; // false = admin (all)

      const [workersRes, issuesRes, tasksRes, matReqRes, usersRes, expensesRes, attendanceRes, paymentsRes] =
        await Promise.all([
          scoped
            ? supabase.from("workers").select("id", { count: "exact", head: true }).in("project_id", projectIds!)
            : supabase.from("workers").select("id", { count: "exact", head: true }),

          scoped
            ? supabase.from("issues").select("id", { count: "exact", head: true }).neq("status", "closed").in("project_id", projectIds!)
            : supabase.from("issues").select("id", { count: "exact", head: true }).neq("status", "closed"),

          scoped
            ? supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done").in("project_id", projectIds!)
            : supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),

          scoped
            ? supabase.from("material_requests").select("id", { count: "exact", head: true }).eq("status", "pending").in("project_id", projectIds!)
            : supabase.from("material_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),

          // totalUsers is always system-wide (admin stat only)
          supabase.from("profiles").select("id", { count: "exact", head: true }),

          scoped
            ? supabase.from("expenses").select("total_amount").in("project_id", projectIds!)
            : supabase.from("expenses").select("total_amount"),

          scoped
            ? supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today).eq("status", "present").in("project_id", projectIds!)
            : supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today).eq("status", "present"),

          scoped
            ? supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending").in("project_id", projectIds!)
            : supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

      return {
        workers:         workersRes.count ?? 0,
        openIssues:      issuesRes.count ?? 0,
        pendingTasks:    tasksRes.count ?? 0,
        pendingRequests: matReqRes.count ?? 0,
        totalUsers:      usersRes.count ?? 0,
        totalExpenses:   (expensesRes.data ?? []).reduce((sum, e) => sum + (e.total_amount ?? 0), 0),
        presentToday:    attendanceRes.count ?? 0,
        pendingPayments: paymentsRes.count ?? 0,
      };
    },
  });
}

/**
 * Fetch expense breakdown by category, scoped to project IDs.
 * Pass `null` for admin (system-wide).
 */
function useExpenseByCategory(projectIds: string[] | null) {
  return useQuery({
    queryKey: ["expenses-by-category", projectIds],
    queryFn: async () => {
      if (projectIds !== null && projectIds.length === 0) return [];

      const scoped = projectIds !== null;
      const { data, error } = scoped
        ? await supabase.from("expenses").select("category, total_amount").in("project_id", projectIds!)
        : await supabase.from("expenses").select("category, total_amount");

      if (error) throw error;
      const grouped = (data ?? []).reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + (e.total_amount ?? 0);
        return acc;
      }, {});
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    },
  });
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({ label, to, icon: Icon, accent }: { label: string; to: string; icon: typeof Building2; accent: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all hover:scale-105 active:scale-95",
        accent,
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

// ─── ADMIN dashboard ──────────────────────────────────────────────────────────
// Admin sees everything — all projects, all stats, all expenses.

function AdminDashboard({ profile }: { profile: Profile }) {
  const { language } = usePrefs();
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects(profile);
  // Admin passes null → no project filter → system-wide counts
  const { data: stats, isLoading: statsLoading } = useDashStats(null);
  const { data: expenseByCategory = [] } = useExpenseByCategory(null);

  const activeProjects = projects.filter((p) => p.status === "active");
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget ?? 0), 0);
  const budgetUsed = projects.reduce((sum, p) => sum + (p.budget_used ?? 0), 0);
  const budgetChartData = projects.slice(0, 6).map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    Budget: p.budget ?? 0,
    Spent: p.budget_used ?? 0,
  }));
  const progressData = projects.slice(0, 5).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    progress: p.progress_percent ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile.full_name?.split(" ")[0] ?? "Admin"} 🛠️`}
        description="Full system overview — all projects, users, and logs."
      />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction label="Manage Users"  to="/users"    icon={Users}        accent="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" />
        <QuickAction label="System Logs"   to="/logs"     icon={ClipboardList} accent="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" />
        <QuickAction label="All Projects"  to="/projects" icon={Building2}    accent="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" />
        <QuickAction label="Settings"      to="/settings" icon={Package}      accent="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("dash.totalProjects",  language)} value={projects.length}               icon={Building2}    accent="amber"  loading={projectsLoading} />
        <StatCard label={t("dash.activeProjects", language)} value={activeProjects.length}          icon={TrendingUp}   accent="green"  loading={projectsLoading} />
        <StatCard label={t("dash.totalBudget",    language)} value={formatINRCompact(totalBudget)}  icon={IndianRupee}  accent="blue"   loading={projectsLoading} />
        <StatCard label={t("dash.budgetUsed",     language)} value={formatINRCompact(budgetUsed)}   icon={IndianRupee}  accent="purple" hint={`${totalBudget > 0 ? Math.round((budgetUsed / totalBudget) * 100) : 0}% used`} loading={projectsLoading} />
        <StatCard label={t("dash.totalWorkers",   language)} value={stats?.workers ?? 0}            icon={HardHat}      accent="slate"  loading={statsLoading} />
        <StatCard label={t("dash.openIssues",     language)} value={stats?.openIssues ?? 0}         icon={AlertTriangle} accent="red"   loading={statsLoading} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("dash.pendingTasks",    language)} value={stats?.pendingTasks ?? 0}                        icon={ListTodo}   accent="blue"  loading={statsLoading} />
        <StatCard label={t("dash.pendingRequests", language)} value={stats?.pendingRequests ?? 0}                     icon={Package}    accent="amber" loading={statsLoading} />
        <StatCard label={t("dash.totalUsers",      language)} value={stats?.totalUsers ?? 0}                          icon={Users}      accent="green" loading={statsLoading} />
        <StatCard label={t("dash.totalExpenses",   language)} value={formatINRCompact(stats?.totalExpenses ?? 0)}     icon={IndianRupee} accent="red"  loading={statsLoading} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.budgetVsSpent", language)}</CardTitle></CardHeader>
          <CardContent>
            {budgetChartData.length === 0 ? <EmptyState icon={Building2} title={t("common.noData", language)} /> : (
              <GradientBarChart data={budgetChartData} bars={[{ key: "Budget", color: "#3b82f6", label: "Budget" }, { key: "Spent", color: "#ef4444", label: "Spent" }]} height={260} formatter={(v) => formatINRCompact(v)} />
            )}
          </CardContent>
        </Card>
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.expenseBreakdown", language)}</CardTitle></CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? <EmptyState icon={IndianRupee} title={t("common.noData", language)} /> : (
              <DonutChart data={expenseByCategory} height={260} />
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.progressTrend", language)}</CardTitle></CardHeader>
          <CardContent>
            {progressData.length === 0 ? <EmptyState icon={TrendingUp} title={t("common.noData", language)} /> : (
              <GradientAreaChart data={progressData} dataKey="progress" color="#ef4444" height={240} />
            )}
          </CardContent>
        </Card>
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.recentProjects", language)}</CardTitle></CardHeader>
          <CardContent>
            {projects.length === 0 ? <EmptyState icon={Building2} title={t("common.noData", language)} /> : (
              <div className="space-y-2">
                {projects.slice(0, 5).map((p) => (
                  <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.state ?? "—"} • {formatINRCompact(p.budget ?? 0)}</p>
                    </div>
                    <div className="w-20 shrink-0"><ProgressBar value={p.progress_percent ?? 0} /><p className="mt-1 text-right text-xs text-muted-foreground">{p.progress_percent ?? 0}%</p></div>
                    <StatusBadge status={p.status} label={t(`status.${p.status}`, language)} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── OWNER dashboard ──────────────────────────────────────────────────────────
// Owner sees only their own projects (created_by = profile.id) and scoped stats.

function OwnerDashboard({ profile }: { profile: Profile }) {
  const { language } = usePrefs();
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects(profile);

  // Derive scoped project IDs — stats will re-fetch automatically when these change
  const projectIds = projects.map((p) => p.id);

  const { data: stats, isLoading: statsLoading } = useDashStats(projectIds);
  const { data: expenseByCategory = [] } = useExpenseByCategory(projectIds);

  const activeProjects = projects.filter((p) => p.status === "active");
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget ?? 0), 0);
  const budgetUsed = projects.reduce((sum, p) => sum + (p.budget_used ?? 0), 0);
  const overBudgetProjects = projects.filter((p) => p.budget > 0 && (p.budget_used / p.budget) > 0.9);
  const budgetChartData = projects.slice(0, 6).map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    Budget: p.budget ?? 0,
    Spent: p.budget_used ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title={`Good day, ${profile.full_name?.split(" ")[0] ?? ""} 💼`}
        description="Your financial overview and project health at a glance."
      />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction label="My Projects" to="/projects" icon={Building2}    accent="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300" />
        <QuickAction label="Reports"     to="/reports"  icon={ClipboardList} accent="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300" />
        <QuickAction label="Payments"    to="/payments" icon={Banknote}      accent="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300" />
        <QuickAction label="Expenses"    to="/expenses" icon={IndianRupee}   accent="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300" />
      </div>

      {overBudgetProjects.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {overBudgetProjects.length} project{overBudgetProjects.length > 1 ? "s are" : " is"} over 90% of budget —{" "}
            <span className="font-bold">{overBudgetProjects.map((p) => p.name).join(", ")}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("dash.totalProjects",  language)} value={projects.length}                              icon={Building2}    accent="amber"  loading={projectsLoading} />
        <StatCard label={t("dash.activeProjects", language)} value={activeProjects.length}                        icon={TrendingUp}   accent="green"  loading={projectsLoading} />
        <StatCard label={t("dash.totalBudget",    language)} value={formatINRCompact(totalBudget)}                icon={IndianRupee}  accent="blue"   loading={projectsLoading} />
        <StatCard label={t("dash.budgetUsed",     language)} value={formatINRCompact(budgetUsed)}                 icon={IndianRupee}  accent="purple" hint={`${totalBudget > 0 ? Math.round((budgetUsed / totalBudget) * 100) : 0}% spent`} loading={projectsLoading} />
        <StatCard label={t("dash.totalExpenses",  language)} value={formatINRCompact(stats?.totalExpenses ?? 0)}  icon={IndianRupee}  accent="red"    loading={statsLoading} />
        <StatCard label="Pending Payments"                   value={stats?.pendingPayments ?? 0}                  icon={Banknote}     accent="slate"  loading={statsLoading} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.budgetVsSpent", language)}</CardTitle></CardHeader>
          <CardContent>
            {budgetChartData.length === 0 ? <EmptyState icon={Building2} title={t("common.noData", language)} /> : (
              <GradientBarChart data={budgetChartData} bars={[{ key: "Budget", color: "#a855f7", label: "Budget" }, { key: "Spent", color: "#f59e0b", label: "Spent" }]} height={260} formatter={(v) => formatINRCompact(v)} />
            )}
          </CardContent>
        </Card>
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.expenseBreakdown", language)}</CardTitle></CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? <EmptyState icon={IndianRupee} title={t("common.noData", language)} /> : (
              <DonutChart data={expenseByCategory} height={260} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 rounded-card shadow-card">
        <CardHeader><CardTitle className="text-base">{t("dash.recentProjects", language)}</CardTitle></CardHeader>
        <CardContent>
          {projects.length === 0 ? <EmptyState icon={Building2} title={t("common.noData", language)} /> : (
            <div className="space-y-2">
              {projects.slice(0, 6).map((p) => {
                const pct = p.budget > 0 ? Math.round((p.budget_used / p.budget) * 100) : 0;
                return (
                  <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.state ?? "—"} • Budget: {formatINRCompact(p.budget ?? 0)}</p>
                    </div>
                    <div className="w-24 shrink-0">
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div className={`h-1.5 rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className={`mt-1 text-right text-xs font-medium ${pct > 90 ? "text-red-600" : pct > 70 ? "text-amber-600" : "text-green-600"}`}>{pct}% used</p>
                    </div>
                    <StatusBadge status={p.status} label={t(`status.${p.status}`, language)} />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ENGINEER dashboard ───────────────────────────────────────────────────────
// Engineer sees only projects they are assigned to (engineer_id = profile.id)
// and all stats (tasks, issues, attendance, materials) scoped to those projects.

function EngineerDashboard({ profile }: { profile: Profile }) {
  const { language } = usePrefs();
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects(profile);

  const projectIds = projects.map((p) => p.id);

  const { data: stats, isLoading: statsLoading } = useDashStats(projectIds);

  const activeProjects = projects.filter((p) => p.status === "active");
  const avgProgress = activeProjects.length > 0
    ? Math.round(activeProjects.reduce((sum, p) => sum + (p.progress_percent ?? 0), 0) / activeProjects.length)
    : 0;
  const progressData = projects.slice(0, 5).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    progress: p.progress_percent ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title={`Good day, ${profile.full_name?.split(" ")[0] ?? ""} 👷`}
        description="Your site overview — tasks, issues, attendance, and progress."
      />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction label="My Tasks"   to="/tasks"      icon={CheckSquare}   accent="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300" />
        <QuickAction label="Issues"     to="/issues"     icon={AlertTriangle} accent="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300" />
        <QuickAction label="Attendance" to="/attendance" icon={UserCheck}     accent="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300" />
        <QuickAction label="Materials"  to="/materials"  icon={Package}       accent="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("dash.activeProjects",  language)} value={activeProjects.length}       icon={Building2}     accent="blue"   loading={projectsLoading} />
        <StatCard label={t("dash.pendingTasks",    language)} value={stats?.pendingTasks ?? 0}    icon={ListTodo}      accent="amber"  loading={statsLoading} />
        <StatCard label={t("dash.openIssues",      language)} value={stats?.openIssues ?? 0}      icon={AlertTriangle} accent="red"    loading={statsLoading} />
        <StatCard label="Present Today"                       value={stats?.presentToday ?? 0}    icon={UserCheck}     accent="green"  loading={statsLoading} />
        <StatCard label={t("dash.pendingRequests", language)} value={stats?.pendingRequests ?? 0} icon={Package}       accent="purple" loading={statsLoading} />
        <StatCard label="Avg Progress"                        value={`${avgProgress}%`}           icon={TrendingUp}    accent="slate"  loading={projectsLoading} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.progressTrend", language)}</CardTitle></CardHeader>
          <CardContent>
            {progressData.length === 0 ? <EmptyState icon={TrendingUp} title={t("common.noData", language)} /> : (
              <GradientAreaChart data={progressData} dataKey="progress" color="#3b82f6" height={260} />
            )}
          </CardContent>
        </Card>
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.recentProjects", language)}</CardTitle></CardHeader>
          <CardContent>
            {projects.length === 0 ? <EmptyState icon={Building2} title={t("common.noData", language)} /> : (
              <div className="space-y-2">
                {projects.slice(0, 5).map((p) => (
                  <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.state ?? "—"}</p>
                    </div>
                    <div className="w-20 shrink-0"><ProgressBar value={p.progress_percent ?? 0} /><p className="mt-1 text-right text-xs text-muted-foreground">{p.progress_percent ?? 0}%</p></div>
                    <StatusBadge status={p.status} label={t(`status.${p.status}`, language)} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── CONTRACTOR dashboard ─────────────────────────────────────────────────────
// Contractor sees only projects they are assigned to (contractor_id = profile.id)
// and all labour/payment/attendance/material stats scoped to those projects.

function ContractorDashboard({ profile }: { profile: Profile }) {
  const { language } = usePrefs();
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects(profile);

  const projectIds = projects.map((p) => p.id);

  const { data: stats, isLoading: statsLoading } = useDashStats(projectIds);

  const activeProjects = projects.filter((p) => p.status === "active");
  const budgetChartData = projects.slice(0, 5).map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    Budget: p.budget ?? 0,
    Spent: p.budget_used ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title={`Good day, ${profile.full_name?.split(" ")[0] ?? ""} 🏗️`}
        description="Labour, attendance, and materials — your daily site management."
      />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction label="Labour"     to="/labour"     icon={HardHat}   accent="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300" />
        <QuickAction label="Attendance" to="/attendance" icon={UserCheck} accent="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300" />
        <QuickAction label="Payments"   to="/payments"   icon={Banknote}  accent="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300" />
        <QuickAction label="Materials"  to="/materials"  icon={Package}   accent="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("dash.activeProjects",  language)} value={activeProjects.length}                          icon={Building2}    accent="amber"  loading={projectsLoading} />
        <StatCard label={t("dash.totalWorkers",    language)} value={stats?.workers ?? 0}                            icon={HardHat}      accent="blue"   loading={statsLoading} />
        <StatCard label="Present Today"                       value={stats?.presentToday ?? 0}                       icon={UserCheck}    accent="green"  loading={statsLoading} />
        <StatCard label="Pending Payments"                    value={stats?.pendingPayments ?? 0}                    icon={Banknote}     accent="purple" loading={statsLoading} />
        <StatCard label={t("dash.pendingRequests", language)} value={stats?.pendingRequests ?? 0}                    icon={Package}      accent="red"    loading={statsLoading} />
        <StatCard label={t("dash.totalExpenses",   language)} value={formatINRCompact(stats?.totalExpenses ?? 0)}    icon={IndianRupee}  accent="slate"  loading={statsLoading} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.budgetVsSpent", language)}</CardTitle></CardHeader>
          <CardContent>
            {budgetChartData.length === 0 ? <EmptyState icon={Building2} title={t("common.noData", language)} /> : (
              <GradientBarChart data={budgetChartData} bars={[{ key: "Budget", color: "#f59e0b", label: "Budget" }, { key: "Spent", color: "#64748b", label: "Spent" }]} height={260} formatter={(v) => formatINRCompact(v)} />
            )}
          </CardContent>
        </Card>
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">{t("dash.recentProjects", language)}</CardTitle></CardHeader>
          <CardContent>
            {projects.length === 0 ? <EmptyState icon={Building2} title={t("common.noData", language)} /> : (
              <div className="space-y-2">
                {projects.slice(0, 5).map((p) => (
                  <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.state ?? "—"}</p>
                    </div>
                    <div className="w-20 shrink-0"><ProgressBar value={p.progress_percent ?? 0} /><p className="mt-1 text-right text-xs text-muted-foreground">{p.progress_percent ?? 0}%</p></div>
                    <StatusBadge status={p.status} label={t(`status.${p.status}`, language)} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuth();
  if (!profile) return null;

  switch (profile.role) {
    case "admin":      return <AdminDashboard      profile={profile} />;
    case "owner":      return <OwnerDashboard      profile={profile} />;
    case "engineer":   return <EngineerDashboard   profile={profile} />;
    case "contractor": return <ContractorDashboard profile={profile} />;
    default:           return <EngineerDashboard   profile={profile} />;
  }
}

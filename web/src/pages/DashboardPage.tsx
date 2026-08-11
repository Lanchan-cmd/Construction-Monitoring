import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  HardHat,
  IndianRupee,
  AlertTriangle,
  ListTodo,
  Package,
  Users,
  TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth, usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatINR, formatINRCompact, formatDate } from "@/lib/format";
import { StatCard, StatusBadge, ProgressBar, EmptyState, PageHeader } from "@/components/ui-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { profile } = useAuth();
  const { language } = usePrefs();
  const navigate = useNavigate();

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [workersRes, issuesRes, tasksRes, matReqRes, usersRes, expensesRes] = await Promise.all([
        supabase.from("workers").select("id", { count: "exact", head: true }),
        supabase.from("issues").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
        supabase.from("material_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("expenses").select("total_amount"),
      ]);
      return {
        workers: workersRes.count ?? 0,
        openIssues: issuesRes.count ?? 0,
        pendingTasks: tasksRes.count ?? 0,
        pendingRequests: matReqRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        totalExpenses: (expensesRes.data ?? []).reduce((sum, e) => sum + (e.total_amount ?? 0), 0),
      };
    },
  });

  const activeProjects = projects.filter((p) => p.status === "active");
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget ?? 0), 0);
  const budgetUsed = projects.reduce((sum, p) => sum + (p.budget_used ?? 0), 0);

  // Chart data: budget vs spent per project (top 6)
  const budgetChartData = projects.slice(0, 6).map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    Budget: p.budget ?? 0,
    Spent: p.budget_used ?? 0,
  }));

  // Chart data: expense breakdown by category
  const { data: expenseByCategory = [] } = useQuery({
    queryKey: ["expenses-by-category"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("category, total_amount");
      if (error) throw error;
      const grouped = (data ?? []).reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + (e.total_amount ?? 0);
        return acc;
      }, {});
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    },
  });

  const PIE_COLORS = ["hsl(32 95% 50%)", "hsl(217 33% 40%)", "hsl(142 71% 45%)", "hsl(0 72% 51%)", "hsl(280 60% 50%)", "hsl(48 90% 50%)"];

  // Progress trend data
  const progressData = projects.slice(0, 5).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    progress: p.progress_percent ?? 0,
  }));

  if (!profile) return null;

  return (
    <div>
      <PageHeader
        title={`${t("dash.welcome", language)}, ${profile.full_name?.split(" ")[0] ?? ""} 👷`}
        description={t("dash.overview", language)}
      />

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={t("dash.totalProjects", language)}
          value={projects.length}
          icon={Building2}
          accent="amber"
          loading={projectsLoading}
        />
        <StatCard
          label={t("dash.activeProjects", language)}
          value={activeProjects.length}
          icon={TrendingUp}
          accent="green"
          loading={projectsLoading}
        />
        <StatCard
          label={t("dash.totalBudget", language)}
          value={formatINRCompact(totalBudget)}
          icon={IndianRupee}
          accent="blue"
          loading={projectsLoading}
        />
        <StatCard
          label={t("dash.budgetUsed", language)}
          value={formatINRCompact(budgetUsed)}
          icon={IndianRupee}
          accent="purple"
          hint={`${totalBudget > 0 ? Math.round((budgetUsed / totalBudget) * 100) : 0}% of budget`}
          loading={projectsLoading}
        />
        <StatCard
          label={t("dash.totalWorkers", language)}
          value={stats?.workers ?? 0}
          icon={HardHat}
          accent="slate"
          loading={statsLoading}
        />
        <StatCard
          label={t("dash.openIssues", language)}
          value={stats?.openIssues ?? 0}
          icon={AlertTriangle}
          accent="red"
          loading={statsLoading}
        />
      </div>

      {/* Secondary stats */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("dash.pendingTasks", language)} value={stats?.pendingTasks ?? 0} icon={ListTodo} accent="blue" loading={statsLoading} />
        <StatCard label={t("dash.pendingRequests", language)} value={stats?.pendingRequests ?? 0} icon={Package} accent="amber" loading={statsLoading} />
        {profile.role === "admin" && (
          <StatCard label={t("dash.totalUsers", language)} value={stats?.totalUsers ?? 0} icon={Users} accent="green" loading={statsLoading} />
        )}
        <StatCard label={t("dash.totalExpenses", language)} value={formatINRCompact(stats?.totalExpenses ?? 0)} icon={IndianRupee} accent="red" loading={statsLoading} />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Budget vs Spent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.budgetVsSpent", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetChartData.length === 0 ? (
              <EmptyState icon={Building2} title={t("common.noData", language)} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={budgetChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => formatINR(v, language)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                  <Bar dataKey="Budget" fill="hsl(217 33% 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" fill="hsl(32 95% 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expense breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.expenseBreakdown", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? (
              <EmptyState icon={IndianRupee} title={t("common.noData", language)} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v, language)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress trend + Recent projects */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.progressTrend", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {progressData.length === 0 ? (
              <EmptyState icon={TrendingUp} title={t("common.noData", language)} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="progress" stroke="hsl(32 95% 50%)" strokeWidth={3} dot={{ fill: "hsl(32 95% 50%)", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.recentProjects", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={t("common.noData", language)}
                description="Create your first project to get started"
              />
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.state ?? "—"} • {formatINRCompact(p.budget ?? 0)}
                      </p>
                    </div>
                    <div className="w-24 shrink-0">
                      <ProgressBar value={p.progress_percent ?? 0} />
                      <p className="mt-1 text-right text-xs text-muted-foreground">{p.progress_percent ?? 0}%</p>
                    </div>
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

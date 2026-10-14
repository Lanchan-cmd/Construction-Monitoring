import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  ArrowLeft, Building2, MapPin, IndianRupee, Calendar, TrendingUp,
  Package, HardHat, Receipt, ListTodo, AlertTriangle, Images,
  Construction, Plus, Check, X, ShieldCheck, Camera, CameraOff,
  Sparkles, Users,
} from "lucide-react";
import { REAL_TIME_MATERIALS, REAL_TIME_WORKERS, REAL_TIME_EXPENSES } from "@/lib/constructionCatalog";
import { supabase, PHOTOS_BUCKET } from "@/lib/supabase";
import { useAuth, usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatINR, formatINRCompact, formatDate, todayISO, calcGST, calcTotalWithGST, calcDailyWage } from "@/lib/format";
import type { Project, Material, Worker, Expense, Task, Issue, DailyProgress, Photo, MaterialRequest, AttendanceStatus, AttendanceRecord, SafetyChecklist } from "@/lib/types";
import { StatusBadge, ProgressBar, PriorityBadge, EmptyState } from "@/components/ui-widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { PhotoGallery } from "@/components/PhotoGallery";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "overview", icon: Building2, labelKey: "project.details" },
  { value: "materials", icon: Package, labelKey: "nav.materials" },
  { value: "labour", icon: HardHat, labelKey: "nav.labour" },
  { value: "expenses", icon: Receipt, labelKey: "nav.expenses" },
  { value: "progress", icon: TrendingUp, labelKey: "nav.progress" },
  { value: "tasks", icon: ListTodo, labelKey: "nav.tasks" },
  { value: "issues", icon: AlertTriangle, labelKey: "nav.issues" },
  { value: "photos", icon: Images, labelKey: "nav.photos" },
  { value: "safety", icon: ShieldCheck, labelKey: "nav.safety" },
] as const;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const { language } = usePrefs();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["value"]>("overview");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading", language)}</div>;
  if (!project) return <EmptyState icon={Building2} title="Project not found" />;

  const canEdit = profile?.role === "admin" || profile?.role === "engineer";
  const budgetPct = project.budget > 0 ? Math.round((project.budget_used / project.budget) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <button onClick={() => navigate("/projects")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("common.back", language)}
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <StatusBadge status={project.status} label={t(`status.${project.status}`, language)} />
          </div>
          {project.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
          {project.state && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[project.village, project.taluk, project.district, project.state].filter(Boolean).join(", ")}
              {project.pin_code && ` - ${project.pin_code}`}
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("project.budget", language)}</p>
            <p className="text-lg font-bold">{formatINR(project.budget, language)}</p>
            <p className="mt-1 text-xs text-muted-foreground">GST: {project.gst_percent}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("project.budgetUsed", language)}</p>
            <p className="text-lg font-bold">{formatINR(project.budget_used, language)}</p>
            <div className="mt-1.5"><ProgressBar value={budgetPct} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("project.progress", language)}</p>
            <p className="text-lg font-bold">{project.progress_percent}%</p>
            <div className="mt-1.5"><ProgressBar value={project.progress_percent} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("project.startDate", language)}</p>
            <p className="text-sm font-semibold">{formatDate(project.start_date, language)}</p>
            <p className="mt-1 text-xs text-muted-foreground">End: {formatDate(project.end_date, language)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(tab.labelKey, language)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview"><OverviewTab project={project} /></TabsContent>
        <TabsContent value="materials"><MaterialsTab projectId={project.id} canEdit={canEdit} /></TabsContent>
        <TabsContent value="labour"><LabourTab projectId={project.id} canEdit={canEdit} session={session} /></TabsContent>
        <TabsContent value="expenses"><ExpensesTab projectId={project.id} canEdit={canEdit} session={session} /></TabsContent>
        <TabsContent value="progress"><ProgressTab projectId={project.id} session={session} /></TabsContent>
        <TabsContent value="tasks"><TasksTab projectId={project.id} canEdit={canEdit} session={session} /></TabsContent>
        <TabsContent value="issues"><IssuesTab projectId={project.id} session={session} /></TabsContent>
        <TabsContent value="photos"><PhotosTab projectId={project.id} session={session} /></TabsContent>
        <TabsContent value="safety"><SafetyTab projectId={project.id} session={session} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Overview tab ----------

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#f97316"];

function OverviewTab({ project }: { project: Project }) {
  const { language } = usePrefs();

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", project.id],
    queryFn: async () => { const { data } = await supabase.from("tasks").select("status").eq("project_id", project.id); return data ?? []; },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", project.id],
    queryFn: async () => { const { data } = await supabase.from("expenses").select("category,total_amount").eq("project_id", project.id); return data ?? []; },
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance-overview", project.id],
    queryFn: async () => { const { data } = await supabase.from("attendance").select("status").eq("project_id", project.id); return data ?? []; },
  });
  const { data: progress = [] } = useQuery({
    queryKey: ["daily-progress", project.id],
    queryFn: async () => { const { data } = await supabase.from("daily_progress").select("log_date,progress_percent").eq("project_id", project.id).order("log_date"); return data ?? []; },
  });

  const budgetData = [
    { name: "Used", value: project.budget_used },
    { name: "Remaining", value: Math.max(0, project.budget - project.budget_used) },
  ];

  const taskData = ["todo", "in_progress", "review", "done"].map((s) => ({
    name: s.replace("_", " "),
    value: tasks.filter((t) => t.status === s).length,
  })).filter((d) => d.value > 0);

  const attendanceData = ["present", "half_day", "absent", "leave"].map((s) => ({
    name: s.replace("_", " "),
    count: attendance.filter((a) => a.status === s).length,
  }));

  const expenseByCategory = Object.entries(
    expenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.total_amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const progressData = progress.map((p) => ({
    date: p.log_date?.slice(5),
    progress: p.progress_percent,
  }));

  return (
    <div className="space-y-4">
      {/* Details + Location */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">{t("project.details", language)}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.status", language)}</dt><dd><StatusBadge status={project.status} label={t(`status.${project.status}`, language)} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.budget", language)}</dt><dd className="font-semibold">{formatINR(project.budget, language)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.gst", language)}</dt><dd className="font-semibold">{project.gst_percent}%</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.startDate", language)}</dt><dd className="font-semibold">{formatDate(project.start_date, language)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.endDate", language)}</dt><dd className="font-semibold">{formatDate(project.end_date, language)}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">{t("project.location", language)}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.state", language)}</dt><dd className="font-semibold">{project.state ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.district", language)}</dt><dd className="font-semibold">{project.district ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.taluk", language)}</dt><dd className="font-semibold">{project.taluk ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.village", language)}</dt><dd className="font-semibold">{project.village ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("project.pinCode", language)}</dt><dd className="font-semibold">{project.pin_code ?? "—"}</dd></div>
              {project.latitude && project.longitude && (
                <div className="flex justify-between"><dt className="text-muted-foreground">GPS</dt><dd className="font-mono text-xs">{project.latitude.toFixed(4)}, {project.longitude.toFixed(4)}</dd></div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 — Budget + Tasks */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Budget Used vs Remaining</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={budgetData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {budgetData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatINR(v, language)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Task Status Breakdown</h3>
            {taskData.length === 0 ? <p className="py-16 text-center text-xs text-muted-foreground">No tasks yet</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taskData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {taskData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 — Attendance + Expenses */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Attendance Summary</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Expense by Category</h3>
            {expenseByCategory.length === 0 ? <p className="py-16 text-center text-xs text-muted-foreground">No expenses yet</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
                    {expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v, language)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart row 3 — Progress over time */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Progress Over Time</h3>
          {progressData.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No progress logs yet</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="progress" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Materials tab ----------

function MaterialsTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { language } = usePrefs();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [populating, setPopulating] = useState(false);

  const { data: materials = [] } = useQuery({
    queryKey: ["materials", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("project_id", projectId).order("name");
      if (error) throw error;
      return data as Material[];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["material-requests", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_requests").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as MaterialRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.from("material_requests").update({ status: approve ? "approved" : "rejected" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["material-requests", projectId] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePopulateRealTime = async () => {
    if (!canEdit) return;
    setPopulating(true);
    try {
      const rows = REAL_TIME_MATERIALS.map((m) => ({
        project_id: projectId,
        name: m.name,
        category: m.category,
        unit: m.unit,
        unit_cost: m.unitCost,
        gst_percent: m.gstPercent,
      }));
      const { error } = await supabase.from("materials").insert(rows);
      if (error) throw error;
      toast.success(`Added ${rows.length} real-time construction materials`);
      queryClient.invalidateQueries({ queryKey: ["materials", projectId] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to populate materials");
    } finally {
      setPopulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Material catalog */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">{t("nav.materials", language)}</h3>
            <p className="text-xs text-muted-foreground">Market rates benchmarked to live South India / Karnataka pricing</p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePopulateRealTime}
                disabled={populating}
                className="gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {populating ? "Populating..." : "Populate Real-Time Catalog"}
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("material.add", language)}
              </Button>
            </div>
          )}
        </div>
        {materials.length === 0 ? (
          <EmptyState icon={Package} title={t("common.noData", language)} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("material.name", language)}</TableHead>
                  <TableHead>{t("material.category", language)}</TableHead>
                  <TableHead>{t("material.unit", language)}</TableHead>
                  <TableHead className="text-right">{t("material.unitCost", language)}</TableHead>
                  <TableHead className="text-right">{t("material.gst", language)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.category ?? "—"}</TableCell>
                    <TableCell>{m.unit}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(m.unit_cost, language)}</TableCell>
                    <TableCell className="text-right">{m.gst_percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Material requests */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">{t("material.requests", language)}</h3>
        {requests.length === 0 ? (
          <EmptyState icon={Package} title={t("common.noData", language)} />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{r.material_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.quantity} {r.unit} • {formatDate(r.created_at, language)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} label={t(`status.${r.status}`, language)} />
                  {canEdit && r.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="default" className="h-8 w-8 p-0" onClick={() => approveMutation.mutate({ id: r.id, approve: true })}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => approveMutation.mutate({ id: r.id, approve: false })}><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && <MaterialFormDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} />}
    </div>
  );
}

function MaterialFormDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string }) {
  const { language } = usePrefs();
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [name, setName] = useState(REAL_TIME_MATERIALS[0].name);
  const [category, setCategory] = useState(REAL_TIME_MATERIALS[0].category);
  const [unit, setUnit] = useState(REAL_TIME_MATERIALS[0].unit);
  const [unitCost, setUnitCost] = useState(REAL_TIME_MATERIALS[0].unitCost.toString());
  const [gstPercent, setGstPercent] = useState(REAL_TIME_MATERIALS[0].gstPercent.toString());
  const [saving, setSaving] = useState(false);

  const handlePresetSelect = (presetName: string) => {
    setSelectedPreset(presetName);
    const found = REAL_TIME_MATERIALS.find((m) => m.name === presetName);
    if (found) {
      setName(found.name);
      setCategory(found.category);
      setUnit(found.unit);
      setUnitCost(found.unitCost.toString());
      setGstPercent(found.gstPercent.toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("materials").insert({
      project_id: projectId, name, category: category || null, unit,
      unit_cost: parseFloat(unitCost) || 0, gst_percent: parseFloat(gstPercent) || 0,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Material added");
    queryClient.invalidateQueries({ queryKey: ["materials", projectId] });
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("material.add", language)}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          {/* Preset quick picker */}
          <div className="space-y-1.5 rounded-lg border bg-amber-50/50 p-2.5 dark:bg-amber-950/20">
            <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Real-Time Market Rate Preset
            </Label>
            <Select value={selectedPreset} onValueChange={handlePresetSelect}>
              <SelectTrigger className="bg-background text-xs"><SelectValue placeholder="Choose a real-time material" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {REAL_TIME_MATERIALS.map((m) => (
                  <SelectItem key={m.name} value={m.name} className="text-xs">
                    {m.name} — ₹{m.unitCost}/{m.unit} (GST {m.gstPercent}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5"><Label>{t("material.name", language)} *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Cement" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("material.category", language)}</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Construction" /></div>
            <div className="space-y-1.5"><Label>{t("material.unit", language)}</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("material.unitCost", language)} (₹)</Label><Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} min="0" /></div>
            <div className="space-y-1.5"><Label>{t("material.gst", language)}</Label><Input type="number" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} min="0" max="28" /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", language)}</Button><Button type="submit" disabled={saving}>{t("common.save", language)}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Labour tab ----------

function LabourTab({ projectId, canEdit, session }: { projectId: string; canEdit: boolean; session: { user: { id: string } } | null }) {
  const { language } = usePrefs();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [populatingLabour, setPopulatingLabour] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(todayISO());

  const { data: workers = [] } = useQuery({
    queryKey: ["workers", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*").eq("project_id", projectId).order("full_name");
      if (error) throw error;
      return data as Worker[];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", projectId, attendanceDate],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").eq("project_id", projectId).eq("date", attendanceDate);
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  const markAttendance = async (workerId: string, status: AttendanceStatus) => {
    const existing = attendance.find((a) => a.worker_id === workerId);
    if (existing) {
      const { error } = await supabase.from("attendance").update({ status }).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("attendance").insert({
        worker_id: workerId, project_id: projectId, date: attendanceDate,
        status, recorded_by: session?.user.id ?? "",
      });
      if (error) { toast.error(error.message); return; }
    }
    queryClient.invalidateQueries({ queryKey: ["attendance", projectId, attendanceDate] });
    toast.success("Attendance marked");
  };

  const handlePopulateLabour = async () => {
    if (!canEdit) return;
    setPopulatingLabour(true);
    try {
      const rows = REAL_TIME_WORKERS.map((w) => ({
        project_id: projectId,
        full_name: w.roleName,
        skill: w.skill,
        daily_wage: w.dailyWage,
        is_active: true,
      }));
      const { error } = await supabase.from("workers").insert(rows);
      if (error) throw error;
      toast.success(`Populated ${rows.length} standard workforce roles`);
      queryClient.invalidateQueries({ queryKey: ["workers", projectId] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to populate workforce");
    } finally {
      setPopulatingLabour(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">{t("nav.labour", language)}</h3>
            <p className="text-xs text-muted-foreground">Standard daily wage rates for skilled and unskilled construction labour</p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePopulateLabour}
                disabled={populatingLabour}
                className="gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <Users className="h-3.5 w-3.5" />
                {populatingLabour ? "Populating..." : "Populate Standard Workforce"}
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("labour.add", language)}
              </Button>
            </div>
          )}
        </div>
        {workers.length === 0 ? (
          <EmptyState icon={HardHat} title={t("common.noData", language)} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("labour.name", language)}</TableHead>
                  <TableHead>{t("labour.skill", language)}</TableHead>
                  <TableHead className="text-right">{t("labour.dailyWage", language)}</TableHead>
                  <TableHead>{t("common.actions", language)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{w.skill ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(w.daily_wage, language)}</TableCell>
                    <TableCell>{w.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Attendance */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("nav.attendance", language)}</h3>
          <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-40" />
        </div>
        {workers.length === 0 ? (
          <EmptyState icon={HardHat} title={t("common.noData", language)} />
        ) : (
          <div className="space-y-2">
            {workers.map((w) => {
              const record = attendance.find((a) => a.worker_id === w.id);
              const currentStatus = record?.status;
              return (
                <Card key={w.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{w.full_name}</p>
                      <p className="text-xs text-muted-foreground">{formatINR(w.daily_wage, language)}/day</p>
                    </div>
                    <div className="flex gap-1">
                      {(["present", "half_day", "absent", "leave"] as AttendanceStatus[]).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={currentStatus === s ? "default" : "outline"}
                          className="h-7 px-2 text-xs"
                          onClick={() => markAttendance(w.id, s)}
                        >
                          {t(`status.${s}`, language)}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {dialogOpen && <WorkerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} />}
    </div>
  );
}

function WorkerFormDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string }) {
  const { language } = usePrefs();
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [fullName, setFullName] = useState(REAL_TIME_WORKERS[1].roleName);
  const [skill, setSkill] = useState(REAL_TIME_WORKERS[1].skill);
  const [phone, setPhone] = useState("");
  const [dailyWage, setDailyWage] = useState(REAL_TIME_WORKERS[1].dailyWage.toString());
  const [saving, setSaving] = useState(false);

  const handlePresetSelect = (roleName: string) => {
    setSelectedPreset(roleName);
    const found = REAL_TIME_WORKERS.find((w) => w.roleName === roleName);
    if (found) {
      setFullName(found.roleName);
      setSkill(found.skill);
      setDailyWage(found.dailyWage.toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("workers").insert({
      project_id: projectId, full_name: fullName, skill: skill || null,
      phone: phone || null, daily_wage: parseFloat(dailyWage) || 0,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Worker added");
    queryClient.invalidateQueries({ queryKey: ["workers", projectId] });
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("labour.add", language)}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          {/* Preset quick picker */}
          <div className="space-y-1.5 rounded-lg border bg-amber-50/50 p-2.5 dark:bg-amber-950/20">
            <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Standard Trade & Wage Benchmark
            </Label>
            <Select value={selectedPreset} onValueChange={handlePresetSelect}>
              <SelectTrigger className="bg-background text-xs"><SelectValue placeholder="Choose a trade role" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {REAL_TIME_WORKERS.map((w) => (
                  <SelectItem key={w.roleName} value={w.roleName} className="text-xs">
                    {w.roleName} — ₹{w.dailyWage}/day
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5"><Label>{t("labour.name", language)} *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("labour.skill", language)}</Label><Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Mason" /></div>
            <div className="space-y-1.5"><Label>{t("auth.phone", language)}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." /></div>
          </div>
          <div className="space-y-1.5"><Label>{t("labour.dailyWage", language)} (₹)</Label><Input type="number" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} min="0" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", language)}</Button><Button type="submit" disabled={saving}>{t("common.save", language)}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Expenses tab ----------

function ExpensesTab({ projectId, canEdit, session }: { projectId: string; canEdit: boolean; session: { user: { id: string } } | null }) {
  const { language } = usePrefs();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").eq("project_id", projectId).order("expense_date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.total_amount, 0);
  const totalGst = expenses.reduce((sum, e) => sum + e.gst_amount, 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("nav.expenses", language)}</h3>
          <p className="text-xs text-muted-foreground">Total: {formatINR(totalExpenses, language)} • GST: {formatINR(totalGst, language)}</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{t("expense.add", language)}</Button>
      </div>
      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title={t("common.noData", language)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("expense.date", language)}</TableHead>
                <TableHead>{t("expense.category", language)}</TableHead>
                <TableHead>{t("expense.description", language)}</TableHead>
                <TableHead className="text-right">{t("expense.amount", language)}</TableHead>
                <TableHead className="text-right">{t("expense.gst", language)}</TableHead>
                <TableHead className="text-right">{t("expense.total", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(e.expense_date, language)}</TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{e.description ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(e.amount, language)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatINR(e.gst_amount, language)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(e.total_amount, language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {dialogOpen && <ExpenseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} userId={session?.user.id ?? ""} />}
    </div>
  );
}

function ExpenseFormDialog({ open, onOpenChange, projectId, userId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; userId: string }) {
  const { language } = usePrefs();
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [category, setCategory] = useState("material");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [gstPercent, setGstPercent] = useState("18");
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const amt = parseFloat(amount) || 0;
  const gst = parseFloat(gstPercent) || 0;
  const gstAmt = calcGST(amt, gst);
  const total = calcTotalWithGST(amt, gst);

  const handlePresetSelect = (title: string) => {
    setSelectedPreset(title);
    const found = REAL_TIME_EXPENSES.find((e) => e.title === title);
    if (found) {
      setCategory(found.category);
      setDescription(found.description);
      setAmount(found.amount.toString());
      setGstPercent(found.gstPercent.toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      project_id: projectId, category, description: description || null,
      amount: amt, gst_percent: gst, gst_amount: gstAmt, total_amount: total,
      expense_date: expenseDate, recorded_by: userId,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Expense added");
    queryClient.invalidateQueries({ queryKey: ["expenses", projectId] });
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("expense.add", language)}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          {/* Preset quick picker */}
          <div className="space-y-1.5 rounded-lg border bg-amber-50/50 p-2.5 dark:bg-amber-950/20">
            <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Real-Time Expense Benchmark Preset
            </Label>
            <Select value={selectedPreset} onValueChange={handlePresetSelect}>
              <SelectTrigger className="bg-background text-xs"><SelectValue placeholder="Choose an expense preset" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {REAL_TIME_EXPENSES.map((e) => (
                  <SelectItem key={e.title} value={e.title} className="text-xs">
                    {e.title} — ₹{e.amount.toLocaleString("en-IN")} ({e.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("expense.category", language)}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["material", "labour", "equipment", "transport", "food", "misc"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("expense.date", language)}</Label><Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>{t("expense.description", language)}</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("expense.amount", language)} (₹)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" /></div>
            <div className="space-y-1.5"><Label>{t("expense.gst", language)} %</Label><Input type="number" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} min="0" max="28" /></div>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">GST Amount</span><span className="font-medium">{formatINR(gstAmt, language)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("expense.total", language)}</span><span className="font-bold">{formatINR(total, language)}</span></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", language)}</Button><Button type="submit" disabled={saving}>{t("common.save", language)}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Progress tab ----------

function ProgressTab({ projectId, session }: { projectId: string; session: { user: { id: string } } | null }) {
  const { language } = usePrefs();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: progress = [] } = useQuery({
    queryKey: ["daily-progress", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_progress").select("*").eq("project_id", projectId).order("log_date", { ascending: false });
      if (error) throw error;
      return data as DailyProgress[];
    },
  });

  const canAdd = true; // admin, engineer, contractor all allowed by RLS

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("nav.progress", language)}</h3>
        {canAdd && <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{t("nav.progress", language)}</Button>}
      </div>
      {progress.length === 0 ? (
        <EmptyState icon={TrendingUp} title={t("common.noData", language)} />
      ) : (
        <div className="space-y-3">
          {progress.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">{formatDate(p.log_date, language)}</p>
                  <Badge>{p.progress_percent}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p.work_description}</p>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>Labour: {p.labour_count}</span>
                  <span>Hours: {p.hours_worked}</span>
                  {p.weather_note && <span>Weather: {p.weather_note}</span>}
                </div>
                <ProgressBar value={p.progress_percent} className="mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {dialogOpen && <ProgressFormDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} userId={session?.user.id ?? ""} />}
    </div>
  );
}

function ProgressFormDialog({ open, onOpenChange, projectId, userId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; userId: string }) {
  const { language } = usePrefs();
  const [logDate, setLogDate] = useState(todayISO());
  const [workDescription, setWorkDescription] = useState("");
  const [progressPercent, setProgressPercent] = useState("0");
  const [labourCount, setLabourCount] = useState("0");
  const [hoursWorked, setHoursWorked] = useState("8");
  const [weatherNote, setWeatherNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("daily_progress").upsert({
      project_id: projectId, log_date: logDate, work_description: workDescription,
      progress_percent: parseInt(progressPercent) || 0, labour_count: parseInt(labourCount) || 0,
      hours_worked: parseFloat(hoursWorked) || 0, weather_note: weatherNote || null,
      recorded_by: userId,
    }, { onConflict: "project_id,log_date" });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Progress logged");
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("nav.progress", language)}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5"><Label>{t("attendance.date", language)}</Label><Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("project.details", language)} *</Label><Textarea value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} required rows={3} placeholder="Foundation work completed, plastering started" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("project.progress", language)} %</Label><Input type="number" value={progressPercent} onChange={(e) => setProgressPercent(e.target.value)} min="0" max="100" /></div>
            <div className="space-y-1.5"><Label>Labour Count</Label><Input type="number" value={labourCount} onChange={(e) => setLabourCount(e.target.value)} min="0" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Hours Worked</Label><Input type="number" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} min="0" /></div>
            <div className="space-y-1.5"><Label>Weather</Label><Input value={weatherNote} onChange={(e) => setWeatherNote(e.target.value)} placeholder="Sunny" /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", language)}</Button><Button type="submit" disabled={saving}>{t("common.save", language)}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Tasks tab ----------

function TasksTab({ projectId, canEdit, session }: { projectId: string; canEdit: boolean; session: { user: { id: string } } | null }) {
  const { language } = usePrefs();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const statusUpdate = async (taskId: string, status: string) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  };

  const columns = [
    { status: "todo", labelKey: "status.todo", color: "border-l-slate-400" },
    { status: "in_progress", labelKey: "status.in_progress", color: "border-l-blue-500" },
    { status: "review", labelKey: "status.review", color: "border-l-purple-500" },
    { status: "done", labelKey: "status.done", color: "border-l-green-500" },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("task.board", language)}</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{t("task.add", language)}</Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className={cn("rounded-lg border border-l-4 bg-muted/20 p-3", col.color)}>
              <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{t(col.labelKey, language)} ({colTasks.length})</p>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <Card key={task.id} className="bg-card">
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold">{task.title}</p>
                      {task.description && <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>}
                      <div className="mt-2 flex items-center gap-2">
                        <PriorityBadge priority={task.priority} />
                        {task.due_date && <span className="text-xs text-muted-foreground">{formatDate(task.due_date, language)}</span>}
                      </div>
                      <Select value={task.status} onValueChange={(v) => statusUpdate(task.id, v)}>
                        <SelectTrigger className="mt-2 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["todo", "in_progress", "review", "done"].map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`, language)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
                {colTasks.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{t("common.noData", language)}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {dialogOpen && <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} userId={session?.user.id ?? ""} />}
    </div>
  );
}

function TaskFormDialog({ open, onOpenChange, projectId, userId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; userId: string }) {
  const { language } = usePrefs();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId, title, description: description || null,
      priority, due_date: dueDate || null, created_by: userId,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Task added");
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("task.add", language)}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5"><Label>{t("task.title", language)} *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>{t("expense.description", language)}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("task.priority", language)}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low", "medium", "high", "critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("task.dueDate", language)}</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", language)}</Button><Button type="submit" disabled={saving}>{t("common.save", language)}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Issues tab ----------

function IssuesTab({ projectId, session }: { projectId: string; session: { user: { id: string } } | null }) {
  const { language } = usePrefs();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: issues = [] } = useQuery({
    queryKey: ["issues", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Issue[];
    },
  });

  const resolveIssue = async (issueId: string) => {
    const { error } = await supabase.from("issues").update({ status: "resolved", resolved_by: session?.user.id ?? null, resolved_at: new Date().toISOString() }).eq("id", issueId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    toast.success("Issue resolved");
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("nav.issues", language)}</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{t("issue.report", language)}</Button>
      </div>
      {issues.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("common.noData", language)} />
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <Card key={issue.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{issue.title}</p>
                  {issue.description && <p className="text-xs text-muted-foreground">{issue.description}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <PriorityBadge priority={issue.severity} />
                    <span className="text-xs text-muted-foreground">{formatDate(issue.created_at, language)}</span>
                  </div>
                </div>
                <StatusBadge status={issue.status} label={t(`status.${issue.status}`, language)} />
                {issue.status !== "resolved" && issue.status !== "closed" && (
                  <Button size="sm" variant="outline" onClick={() => resolveIssue(issue.id)} className="gap-1"><Check className="h-3.5 w-3.5" />{t("issue.resolve", language)}</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {dialogOpen && <IssueFormDialog open={dialogOpen} onOpenChange={setDialogOpen} projectId={projectId} userId={session?.user.id ?? ""} />}
    </div>
  );
}

function IssueFormDialog({ open, onOpenChange, projectId, userId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; userId: string }) {
  const { language } = usePrefs();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("issues").insert({
      project_id: projectId, title, description: description || null,
      severity, reported_by: userId,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Issue reported");
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("issue.report", language)}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5"><Label>{t("issue.title", language)} *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>{t("expense.description", language)}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="space-y-1.5"><Label>{t("issue.severity", language)}</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["low", "medium", "high", "critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", language)}</Button><Button type="submit" disabled={saving}>{t("common.save", language)}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Photos tab ----------

function PhotosTab({ projectId, session }: { projectId: string; session: { user: { id: string } } | null }) {
  const { language } = usePrefs();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [photoType, setPhotoType] = useState("site");
  const [uploading, setUploading] = useState(false);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["photos", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("photos").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    setUploading(true);
    const filePath = `${projectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(PHOTOS_BUCKET).upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filePath);
    const { error: dbError } = await supabase.from("photos").insert({
      project_id: projectId, storage_path: filePath, public_url: urlData.publicUrl,
      caption: caption || null, photo_type: photoType, uploaded_by: session.user.id,
    });
    if (dbError) { toast.error(dbError.message); setUploading(false); return; }
    toast.success("Photo uploaded");
    setCaption("");
    queryClient.invalidateQueries({ queryKey: ["photos", projectId] });
    setUploading(false);
  };

  return (
    <div>
      <div className="mb-4 rounded-2xl border bg-muted/20 p-4">
        <h3 className="mb-3 text-sm font-semibold">Upload Photo</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={photoType} onValueChange={setPhotoType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["site", "inspection", "bill", "issue", "progress"].map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-1"><Label>Caption</Label><Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional" /></div>
          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              {uploading ? t("common.loading", language) : "Choose Photo"}
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>
      </div>
      <PhotoGallery photos={photos} loading={isLoading} />
    </div>
  );
}

// ---------- Safety tab ----------

const ROBOFLOW_WORKFLOW_URL = "https://serverless.roboflow.com/poornachandra-k-k/workflows/construction-site-safety-3dbwu";
const ROBOFLOW_API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY as string;

const PPE_CLASS_MAP: Record<string, SafetyItem> = {
  helmet: "helmet", "hard-hat": "helmet", hardhat: "helmet", "safety helmet": "helmet", "hard hat": "helmet",
  boots: "boots", "safety-boots": "boots", "safety boots": "boots", shoe: "boots",
  harness: "harness", "safety-harness": "harness", "safety harness": "harness",
  gloves: "gloves", "safety-gloves": "gloves", "safety gloves": "gloves",
  vest: "vest", "safety-vest": "vest", "safety vest": "vest", "hi-vis": "vest", "high-visibility": "vest",
  goggles: "goggles", "safety-glasses": "goggles", glasses: "goggles",
};

const SAFETY_ITEMS = ["helmet", "boots", "harness", "gloves", "vest", "goggles"] as const;
type SafetyItem = typeof SAFETY_ITEMS[number];

function SafetyTab({ projectId, session }: { projectId: string; session: { user: { id: string } } | null }) {
  const queryClient = useQueryClient();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [checks, setChecks] = useState<Record<SafetyItem, boolean>>({ helmet: false, boots: false, harness: false, gloves: false, vest: false, goggles: false });
  const [notes, setNotes] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoCallbackRef = (el: HTMLVideoElement | null) => {
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  };

  const { data: workers = [] } = useQuery({
    queryKey: ["workers", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("workers").select("*").eq("project_id", projectId).order("full_name");
      return (data ?? []) as Worker[];
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["safety", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("safety_checklists").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      return (data ?? []) as SafetyChecklist[];
    },
  });

  // Sends base64 frame directly to Roboflow — no storage upload needed
  const runDetection = async () => {
    const videoEl = document.querySelector<HTMLVideoElement>("video[data-safety]");
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;
    const w = videoEl.videoWidth || videoEl.clientWidth;
    const h = videoEl.videoHeight || videoEl.clientHeight;
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(videoEl, 0, 0, w, h);
    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    try {
      const res = await fetch(ROBOFLOW_WORKFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ROBOFLOW_API_KEY}` },
        body: JSON.stringify({ inputs: { image: { type: "base64", value: base64 } } }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const predictions: { class?: string }[] =
        json?.outputs?.[0]?.predictions?.predictions ??
        json?.outputs?.predictions?.predictions ??
        json?.predictions ?? [];
      const detected = new Set<SafetyItem>();
      for (const pred of predictions) {
        const label = (pred.class ?? "").toLowerCase();
        const mapped = PPE_CLASS_MAP[label] ?? PPE_CLASS_MAP[pred.class ?? ""];
        if (mapped) detected.add(mapped);
      }
      if (detected.size > 0) {
        setChecks((prev) => {
          const next = { ...prev };
          detected.forEach((k) => { next[k] = true; });
          return next;
        });
        setScanStatus("✓ Detected: " + [...detected].join(", "));
      } else {
        setScanStatus("No PPE detected — adjust position...");
      }
    } catch (e: unknown) {
      setScanStatus("Scan error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(location.protocol === "http:" ? "Camera requires HTTPS — use localhost or https://." : "Camera not supported.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOpen(true);
      setScanning(true);
      setScanStatus("Scanning for PPE...");
      intervalRef.current = setInterval(runDetection, 3000);
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      const msg = name === "NotAllowedError" ? "Camera permission denied."
        : name === "NotFoundError" ? "No camera found."
        : name === "NotReadableError" ? "Camera in use by another app."
        : "Camera error: " + (err instanceof Error ? err.message : String(err));
      toast.error(msg, { duration: 6000 });
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setScanning(false);
    setScanStatus("");
  };

  const captureAndClose = () => {
    const videoEl = document.querySelector<HTMLVideoElement>("video[data-safety]");
    const canvas = canvasRef.current;
    if (!canvas || !videoEl) return;
    const w = videoEl.videoWidth || videoEl.clientWidth;
    const h = videoEl.videoHeight || videoEl.clientHeight;
    if (!w || !h) { toast.error("Camera not ready."); return; }
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(videoEl, 0, 0, w, h);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
  };

  const handleSave = async () => {
    if (!selectedWorker) { toast.error("Select a worker"); return; }
    const missing = SAFETY_ITEMS.filter((k) => !checks[k]);
    if (missing.length > 0) {
      toast.error(`⚠️ Missing PPE: ${missing.join(", ")} — worker must wear all required safety items.`, { duration: 7000 });
      return;
    }
    setSaving(true);
    let photoPath: string | null = null;
    let publicUrl: string | null = null;
    // Only the final captured photo is stored — not scan frames
    if (capturedImage) {
      const blob = await (await fetch(capturedImage)).blob();
      const path = `safety/${projectId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("site-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (!upErr) {
        photoPath = path;
        publicUrl = supabase.storage.from("site-photos").getPublicUrl(path).data.publicUrl;
      }
    }
    const { error } = await supabase.from("safety_checklists").upsert({
      project_id: projectId, worker_id: selectedWorker.id,
      check_date: new Date().toISOString().slice(0, 10),
      ...checks, notes: notes || null, photo_path: photoPath,
      public_url: publicUrl, recorded_by: session?.user.id ?? null,
    }, { onConflict: "worker_id,check_date" });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Safety check saved");
    queryClient.invalidateQueries({ queryKey: ["safety", projectId] });
    setSelectedWorker(null);
    setChecks({ helmet: false, boots: false, harness: false, gloves: false, vest: false, goggles: false });
    setNotes(""); setCapturedImage(null); setSaving(false);
  };

  const allPassed = (c: SafetyChecklist) => SAFETY_ITEMS.every((k) => c[k]);
  const detectedCount = Object.values(checks).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-500" />Daily Safety Check
          </h3>

          <div className="space-y-1.5">
            <Label>Worker *</Label>
            <Select value={selectedWorker?.id ?? ""} onValueChange={(id) => setSelectedWorker(workers.find((w) => w.id === id) ?? null)}>
              <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
              <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              PPE auto-detected by camera ({detectedCount}/{SAFETY_ITEMS.length}) — tap to toggle manually
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SAFETY_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setChecks((p) => ({ ...p, [item]: !p[item] }))}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                    checks[item]
                      ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "border-red-300 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                  }`}
                >
                  {checks[item] ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-400" />}
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Auto PPE Scan</Label>
            {!cameraOpen && !capturedImage && (
              <Button type="button" variant="outline" onClick={startCamera} className="gap-2 w-full">
                <Camera className="h-4 w-4" />Open Camera &amp; Scan
              </Button>
            )}
            {cameraOpen && (
              <div className="space-y-2">
                <div className="relative">
                  <video data-safety ref={videoCallbackRef} autoPlay playsInline muted className="w-full rounded-lg border bg-black" />
                  {scanning && (
                    <div className="absolute bottom-2 left-2 right-2 rounded-md bg-black/70 px-3 py-1.5 text-xs text-white">
                      🔍 {scanStatus || "Scanning..."}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={captureAndClose} className="flex-1 gap-2">
                    <Camera className="h-4 w-4" />Capture &amp; Done
                  </Button>
                  <Button type="button" variant="outline" onClick={stopCamera} className="gap-2">
                    <CameraOff className="h-4 w-4" />Cancel
                  </Button>
                </div>
              </div>
            )}
            {capturedImage && (
              <div className="space-y-2">
                <img src={capturedImage} alt="Captured" className="w-full rounded-lg border" />
                <Button type="button" variant="outline" size="sm" onClick={() => { setCapturedImage(null); startCamera(); }} className="gap-2 w-full">
                  <Camera className="h-4 w-4" />Retake
                </Button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          <Button onClick={handleSave} disabled={saving || !selectedWorker} className="w-full gap-2">
            <ShieldCheck className="h-4 w-4" />
            {saving ? "Saving..." : detectedCount === SAFETY_ITEMS.length
              ? "Save Safety Check ✓"
              : `Save (${detectedCount}/${SAFETY_ITEMS.length} PPE detected)`}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Today's Safety Records</h3>
        {checklists.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No safety checks recorded yet" />
        ) : (
          <div className="space-y-2">
            {checklists.map((c) => {
              const worker = workers.find((w) => w.id === c.worker_id);
              const passed = allPassed(c);
              return (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{worker?.full_name ?? "Unknown"}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {passed ? "✓ All Clear" : "⚠ Incomplete"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SAFETY_ITEMS.map((item) => (
                        <span key={item} className={`rounded px-2 py-0.5 text-xs ${c[item] ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {c[item] ? "✓" : "✗"} {item}
                        </span>
                      ))}
                    </div>
                    {c.public_url && <img src={c.public_url} alt="Safety scan" className="mt-2 h-20 w-auto rounded border object-cover" />}
                    {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{c.check_date}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

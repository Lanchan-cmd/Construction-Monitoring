import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package, HardHat, Receipt, ListTodo, AlertTriangle, Images,
  Search, Plus, Check, X, CalendarCheck, TrendingUp, MessageSquare, Sparkles,
} from "lucide-react";
import { REAL_TIME_EXPENSES } from "@/lib/constructionCatalog";
import { supabase } from "@/lib/supabase";
import { useAuth, usePrefs, useMyProjectIds } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatINR, formatDate, todayISO, calcGST, calcTotalWithGST } from "@/lib/format";
import type { Material, MaterialRequest, Worker, Expense, Task, Issue, Photo, Project, AttendanceRecord, AttendanceStatus, DailyProgress, Payment } from "@/lib/types";
import { PageHeader, StatusBadge, PriorityBadge, EmptyState, ProgressBar } from "@/components/ui-widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ============================================================
// Shared helpers for cross-module pages
// ============================================================

/** Fetch projects as a lookup map, scoped to the current user's role. */
function useProjectsMap() {
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-map", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let query = supabase.from("projects").select("id, name, status").order("name");
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as Pick<Project, "id" | "name" | "status">[];
        query = query.in("id", myIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Pick<Project, "id" | "name" | "status">[];
    },
  });
  const map = new Map(projects.map((p) => [p.id, p]));
  return { projects, map };
}

function ProjectCell({ projectId, map, navigate }: { projectId: string; map: Map<string, Pick<Project, "id" | "name" | "status">>; navigate: (path: string) => void }) {
  const project = map.get(projectId);
  return (
    <button
      onClick={() => navigate(`/projects/${projectId}`)}
      className="text-left text-sm font-medium text-primary hover:underline"
    >
      {project?.name ?? "Unknown"}
    </button>
  );
}

// ============================================================
// Materials page (aggregate across all projects)
// ============================================================

export function MaterialsPage() {
  const { language } = usePrefs();
  const navigate = useNavigate();
  const { map } = useProjectsMap();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { profile } = useAuth();
  const canEdit = profile?.role === "admin" || profile?.role === "engineer";
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const { data: materials = [] } = useQuery({
    queryKey: ["materials-all", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("materials").select("*").order("name");
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as Material[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Material[];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["material-requests-all", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("material_requests").select("*").order("created_at", { ascending: false });
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as MaterialRequest[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as MaterialRequest[];
    },
  });

  const approveReq = async (id: string, approve: boolean) => {
    const { error } = await supabase.from("material_requests").update({ status: approve ? "approved" : "rejected" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["material-requests-all"] });
    toast.success(approve ? "Approved" : "Rejected");
  };

  const filtered = materials.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t("nav.materials", language)} description={`${materials.length} materials • ${requests.filter((r) => r.status === "pending").length} pending requests`} />

      {/* Pending requests */}
      {requests.filter((r) => r.status === "pending").length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold">Pending Material Requests</p>
            <div className="space-y-2">
              {requests.filter((r) => r.status === "pending").map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{r.material_name} — {r.quantity} {r.unit}</p>
                    <p className="text-xs text-muted-foreground">{map.get(r.project_id)?.name ?? "Unknown"} • {formatDate(r.created_at, language)}</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-8 w-8 p-0" onClick={() => approveReq(r.id, true)}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => approveReq(r.id, false)}><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("common.search", language)} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title={t("common.noData", language)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("material.name", language)}</TableHead>
                <TableHead>{t("nav.projects", language)}</TableHead>
                <TableHead>{t("material.category", language)}</TableHead>
                <TableHead className="text-right">{t("material.unitCost", language)}</TableHead>
                <TableHead className="text-right">{t("material.gst", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${m.project_id}`)}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><ProjectCell projectId={m.project_id} map={map} navigate={navigate} /></TableCell>
                  <TableCell className="text-muted-foreground">{m.category ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(m.unit_cost, language)}</TableCell>
                  <TableCell className="text-right">{m.gst_percent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Labour page (aggregate across all projects)
// ============================================================

export function LabourPage() {
  const { language } = usePrefs();
  const navigate = useNavigate();
  const { map } = useProjectsMap();
  const [search, setSearch] = useState("");
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-all", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("workers").select("*").order("full_name");
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as Worker[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Worker[];
    },
  });

  const filtered = workers.filter((w) => w.full_name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = workers.filter((w) => w.is_active).length;
  const totalDailyWage = workers.filter((w) => w.is_active).reduce((sum, w) => sum + w.daily_wage, 0);

  return (
    <div>
      <PageHeader title={t("nav.labour", language)} description={`${workers.length} workers • ${activeCount} active • Daily wage total: ${formatINR(totalDailyWage, language)}`} />

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("common.search", language)} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={HardHat} title={t("common.noData", language)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("labour.name", language)}</TableHead>
                <TableHead>{t("nav.projects", language)}</TableHead>
                <TableHead>{t("labour.skill", language)}</TableHead>
                <TableHead className="text-right">{t("labour.dailyWage", language)}</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w) => (
                <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${w.project_id}`)}>
                  <TableCell className="font-medium">{w.full_name}</TableCell>
                  <TableCell><ProjectCell projectId={w.project_id} map={map} navigate={navigate} /></TableCell>
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
  );
}

// ============================================================
// Attendance page (aggregate, today's view)
// ============================================================

export function AttendancePage() {
  const { language } = usePrefs();
  const navigate = useNavigate();
  const { map } = useProjectsMap();
  const [date, setDate] = useState(todayISO());
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const { data: records = [] } = useQuery({
    queryKey: ["attendance-all", date, isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("attendance").select("*, workers(full_name)").eq("date", date);
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as (AttendanceRecord & { workers: { full_name: string } | null })[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as (AttendanceRecord & { workers: { full_name: string } | null })[];
    },
  });

  const present = records.filter((r) => r.status === "present").length;
  const halfDay = records.filter((r) => r.status === "half_day").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const leave = records.filter((r) => r.status === "leave").length;

  return (
    <div>
      <PageHeader
        title={t("nav.attendance", language)}
        description={`${formatDate(date, language)} • P:${present} H:${halfDay} A:${absent} L:${leave}`}
        action={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />}
      />

      {records.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={t("common.noData", language)} description="No attendance marked for this date" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>{t("nav.projects", language)}</TableHead>
                <TableHead>{t("attendance.status", language)}</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Overtime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${r.project_id}`)}>
                  <TableCell className="font-medium">{r.workers?.full_name ?? "Unknown"}</TableCell>
                  <TableCell><ProjectCell projectId={r.project_id} map={map} navigate={navigate} /></TableCell>
                  <TableCell><StatusBadge status={r.status} label={t(`status.${r.status}`, language)} /></TableCell>
                  <TableCell className="text-right">{r.hours_worked ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.overtime_hours > 0 ? r.overtime_hours : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Expenses page (aggregate)
// ============================================================

export function ExpensesPage() {
  const { language } = usePrefs();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { map } = useProjectsMap();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-all", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as Expense[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Expense[];
    },
  });

  const filtered = expenses.filter((e) => e.category.toLowerCase().includes(search.toLowerCase()) || (e.description ?? "").toLowerCase().includes(search.toLowerCase()));
  const total = expenses.reduce((sum, e) => sum + e.total_amount, 0);
  const totalGst = expenses.reduce((sum, e) => sum + e.gst_amount, 0);

  return (
    <div>
      <PageHeader
        title={t("nav.expenses", language)}
        description={`Total: ${formatINR(total, language)} • GST: ${formatINR(totalGst, language)}`}
        action={<Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{t("expense.add", language)}</Button>}
      />

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("common.search", language)} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title={t("common.noData", language)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("expense.date", language)}</TableHead>
                <TableHead>{t("nav.projects", language)}</TableHead>
                <TableHead>{t("expense.category", language)}</TableHead>
                <TableHead>{t("expense.description", language)}</TableHead>
                <TableHead className="text-right">{t("expense.amount", language)}</TableHead>
                <TableHead className="text-right">{t("expense.total", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${e.project_id}`)}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDate(e.expense_date, language)}</TableCell>
                  <TableCell><ProjectCell projectId={e.project_id} map={map} navigate={navigate} /></TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{e.description ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(e.amount, language)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(e.total_amount, language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogOpen && (
        <ExpenseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projects={[...map.values()]}
          userId={session?.user?.id ?? ""}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["expenses-all"] })}
        />
      )}
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, projects, userId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; projects: Pick<Project, "id" | "name">[]; userId: string; onSaved: () => void }) {
  const { language } = usePrefs();
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [category, setCategory] = useState("material");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [gstPercent, setGstPercent] = useState("18");
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const amt = parseFloat(amount) || 0;
  const gst = parseFloat(gstPercent) || 0;

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
    if (!projectId) { toast.error("Select a project"); return; }
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      project_id: projectId, category, description: description || null,
      amount: amt, gst_percent: gst, gst_amount: calcGST(amt, gst), total_amount: calcTotalWithGST(amt, gst),
      expense_date: expenseDate, recorded_by: userId,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Expense added");
    onSaved();
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

          <div className="space-y-1.5"><Label>{t("nav.projects", language)} *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("expense.category", language)}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["material", "labour", "equipment", "transport", "food", "misc"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
            <div className="flex justify-between"><span className="text-muted-foreground">Total with GST</span><span className="font-bold">{formatINR(calcTotalWithGST(amt, gst), language)}</span></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", language)}</Button><Button type="submit" disabled={saving}>{t("common.save", language)}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Tasks page (aggregate)
// ============================================================

export function TasksPage() {
  const { language } = usePrefs();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { map } = useProjectsMap();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-all", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as Task[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
  });

  const filtered = statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter);

  const updateStatus = async (taskId: string, status: string, projectId: string) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  };

  return (
    <div>
      <PageHeader
        title={t("nav.tasks", language)}
        description={`${tasks.length} tasks`}
        action={<Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{t("task.add", language)}</Button>}
      />

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", language)}</SelectItem>
            {["todo", "in_progress", "review", "done"].map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`, language)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ListTodo} title={t("common.noData", language)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("task.title", language)}</TableHead>
                <TableHead>{t("nav.projects", language)}</TableHead>
                <TableHead>{t("task.priority", language)}</TableHead>
                <TableHead>{t("task.dueDate", language)}</TableHead>
                <TableHead>{t("project.status", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <p className="font-medium">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                  </TableCell>
                  <TableCell><ProjectCell projectId={task.project_id} map={map} navigate={navigate} /></TableCell>
                  <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                  <TableCell className="text-xs">{formatDate(task.due_date, language)}</TableCell>
                  <TableCell>
                    <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v, task.project_id)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["todo", "in_progress", "review", "done"].map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`, language)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogOpen && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projects={[...map.values()]}
          userId={session?.user?.id ?? ""}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["tasks-all"] })}
        />
      )}
    </div>
  );
}

function TaskDialog({ open, onOpenChange, projects, userId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; projects: Pick<Project, "id" | "name">[]; userId: string; onSaved: () => void }) {
  const { language } = usePrefs();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) { toast.error("Select a project"); return; }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId, title, description: description || null,
      priority, due_date: dueDate || null, created_by: userId,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Task added");
    onSaved();
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("task.add", language)}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5"><Label>{t("nav.projects", language)} *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
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

// ============================================================
// Issues page (aggregate)
// ============================================================

export function IssuesPage() {
  const { language } = usePrefs();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { map } = useProjectsMap();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const { data: issues = [] } = useQuery({
    queryKey: ["issues-all", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("issues").select("*").order("created_at", { ascending: false });
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as Issue[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Issue[];
    },
  });

  const filtered = statusFilter === "all" ? issues : issues.filter((i) => i.status === statusFilter);

  const resolveIssue = async (issueId: string) => {
    const { error } = await supabase.from("issues").update({ status: "resolved", resolved_by: session?.user?.id ?? null, resolved_at: new Date().toISOString() }).eq("id", issueId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["issues-all"] });
    toast.success("Issue resolved");
  };

  return (
    <div>
      <PageHeader
        title={t("nav.issues", language)}
        description={`${issues.filter((i) => i.status === "open" || i.status === "in_progress").length} active issues`}
        action={<Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{t("issue.report", language)}</Button>}
      />

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", language)}</SelectItem>
            {["open", "in_progress", "resolved", "closed"].map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`, language)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("common.noData", language)} />
      ) : (
        <div className="space-y-2">
          {filtered.map((issue) => (
            <Card key={issue.id} className="cursor-pointer hover:shadow-sm" onClick={() => navigate(`/projects/${issue.project_id}`)}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{issue.title}</p>
                  {issue.description && <p className="text-xs text-muted-foreground">{issue.description}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <PriorityBadge priority={issue.severity} />
                    <span className="text-xs text-muted-foreground">{map.get(issue.project_id)?.name ?? "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">• {formatDate(issue.created_at, language)}</span>
                  </div>
                </div>
                <StatusBadge status={issue.status} label={t(`status.${issue.status}`, language)} />
                {issue.status !== "resolved" && issue.status !== "closed" && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); resolveIssue(issue.id); }} className="gap-1">
                    <Check className="h-3.5 w-3.5" />{t("issue.resolve", language)}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialogOpen && (
        <IssueDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projects={[...map.values()]}
          userId={session?.user?.id ?? ""}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["issues-all"] })}
        />
      )}
    </div>
  );
}

function IssueDialog({ open, onOpenChange, projects, userId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; projects: Pick<Project, "id" | "name">[]; userId: string; onSaved: () => void }) {
  const { language } = usePrefs();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) { toast.error("Select a project"); return; }
    setSaving(true);
    const { error } = await supabase.from("issues").insert({
      project_id: projectId, title, description: description || null,
      severity, reported_by: userId,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Issue reported");
    onSaved();
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("issue.report", language)}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5"><Label>{t("nav.projects", language)} *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
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

// ============================================================
// Photos page (aggregate gallery)
// ============================================================

export function PhotosPage() {
  const { language } = usePrefs();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { map } = useProjectsMap();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [caption, setCaption] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const deletePhoto = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this photo?")) return;
    setDeleting(photo.id);
    await supabase.storage.from("site-photos").remove([photo.storage_path]);
    const { error } = await supabase.from("photos").delete().eq("id", photo.id);
    if (error) { toast.error(error.message); setDeleting(null); return; }
    toast.success("Photo deleted");
    queryClient.invalidateQueries({ queryKey: ["photos-all"] });
    setDeleting(null);
  };

  const { data: photos = [] } = useQuery({
    queryKey: ["photos-all", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("photos").select("*").order("created_at", { ascending: false });
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as Photo[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Photo[];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId || !session?.user?.id) {
      if (!projectId) toast.error("Select a project first");
      return;
    }
    setUploading(true);
    const filePath = `${projectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("site-photos").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("site-photos").getPublicUrl(filePath);
    const { error: dbError } = await supabase.from("photos").insert({
      project_id: projectId, storage_path: filePath, public_url: urlData.publicUrl,
      caption: caption || null, photo_type: "site", uploaded_by: session.user.id,
    });
    if (dbError) { toast.error(dbError.message); setUploading(false); return; }
    toast.success("Photo uploaded");
    setCaption("");
    queryClient.invalidateQueries({ queryKey: ["photos-all"] });
    setUploading(false);
  };

  return (
    <div>
      <PageHeader title={t("nav.photos", language)} description={`${photos.length} photos`} />

      {/* Upload bar */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label>{t("nav.projects", language)}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>{[...map.values()].map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label>Caption</Label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional" />
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            {uploading ? t("common.loading", language) : "Upload Photo"}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </CardContent>
      </Card>

      {photos.length === 0 ? (
        <EmptyState icon={Images} title={t("common.noData", language)} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {photos.map((photo) => (
            <Card key={photo.id} className="group relative cursor-pointer overflow-hidden" onClick={() => navigate(`/projects/${photo.project_id}`)}>
              <div className="relative aspect-square bg-muted">
                {photo.public_url && <img src={photo.public_url} alt={photo.caption ?? ""} className="h-full w-full object-cover" />}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="truncate text-[10px] text-white">{map.get(photo.project_id)?.name ?? "Unknown"}</p>
                </div>
                <button
                  onClick={(e) => deletePhoto(photo, e)}
                  disabled={deleting === photo.id}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {photo.caption && (
                <CardContent className="p-2"><p className="truncate text-xs text-muted-foreground">{photo.caption}</p></CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Progress page (aggregate daily progress)
// ============================================================

export function ProgressPage() {
  const { language } = usePrefs();
  const navigate = useNavigate();
  const { map } = useProjectsMap();

  const { data: progress = [] } = useQuery({
    queryKey: ["progress-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_progress").select("*").order("log_date", { ascending: false }).limit(50);
      if (error) throw error;
      return data as DailyProgress[];
    },
  });

  return (
    <div>
      <PageHeader title={t("nav.progress", language)} description={`${progress.length} recent entries`} />

      {progress.length === 0 ? (
        <EmptyState icon={TrendingUp} title={t("common.noData", language)} />
      ) : (
        <div className="space-y-3">
          {progress.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-sm" onClick={() => navigate(`/projects/${p.project_id}`)}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{map.get(p.project_id)?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.log_date, language)}</p>
                  </div>
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
    </div>
  );
}

// ============================================================
// Payments / Payroll page

// ============================================================
// Payments / Payroll page
// ============================================================

const FAST2SMS_KEY = import.meta.env.VITE_FAST2SMS_API_KEY as string;

async function sendSMS(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: { authorization: FAST2SMS_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ route: "q", message, language: "english", flash: 0, numbers: phone }),
    });
    const json = await res.json();
    if (json.return === true) {
      return { ok: true };
    }
    const errMsg = Array.isArray(json.message) ? json.message.join(", ") : (json.message || "Failed to send SMS");
    return { ok: false, error: errMsg };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export function PaymentsPage() {
  const { language } = usePrefs();
  const { session } = useAuth();
  const { projects, map } = useProjectsMap();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState("all");
  const [sending, setSending] = useState(false);
  const { ids: myIds, isAdmin } = useMyProjectIds();

  const { data: payments = [] } = useQuery({
    queryKey: ["payments-all", projectId, isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("payments").select("*, workers(full_name)").order("payment_date", { ascending: false });
      // Scope to user's projects first, then optionally narrow to a specific project
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as (Payment & { workers: { full_name: string } | null })[];
        q = q.in("project_id", myIds);
      }
      if (projectId !== "all") q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as (Payment & { workers: { full_name: string } | null })[];
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-all", isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("workers").select("*").order("full_name");
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as Worker[];
        q = q.in("project_id", myIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Worker[];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance-payroll", projectId, isAdmin ? "admin" : myIds],
    enabled: isAdmin || myIds !== null,
    queryFn: async () => {
      let q = supabase.from("attendance").select("*");
      if (!isAdmin && myIds !== null) {
        if (myIds.length === 0) return [] as AttendanceRecord[];
        q = q.in("project_id", myIds);
      }
      if (projectId !== "all") q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  const payrollSummary = workers
    .filter((w) => projectId === "all" || w.project_id === projectId)
    .map((w) => {
      const records = attendance.filter((a) => a.worker_id === w.id);
      const presentDays = records.filter((a) => a.status === "present").length;
      const halfDays = records.filter((a) => a.status === "half_day").length;
      const totalDays = presentDays + halfDays * 0.5;
      const earned = totalDays * w.daily_wage;
      const paid = payments.filter((p) => p.worker_id === w.id).reduce((s, p) => s + p.amount, 0);
      return { worker: w, totalDays, earned, paid, balance: earned - paid };
    });

  const totalEarned = payrollSummary.reduce((s, r) => s + r.earned, 0);
  const totalPaid = payrollSummary.reduce((s, r) => s + r.paid, 0);
  const totalBalance = payrollSummary.reduce((s, r) => s + r.balance, 0);

  const markPaid = async (workerId: string, projId: string, amount: number) => {
    const { error } = await supabase.from("payments").insert({
      worker_id: workerId, project_id: projId, amount,
      payment_date: todayISO(), status: "paid", method: "cash", paid_by: session?.user?.id ?? "",
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["payments-all"] });
    toast.success("Payment recorded");
  };

  const getWorkerMessage = (workerName: string, totalDays: number, earned: number, balance: number) => {
    const now = new Date();
    const weekNum = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7);
    const status = balance <= 0 ? "Paid" : "Pending";
    return `*Nirman App* 🏗️\nDear ${workerName},\nWeek ${weekNum} summary:\n• Days worked: ${totalDays}\n• Total earned: Rs.${Math.round(earned).toLocaleString("en-IN")}\n• Balance due: Rs.${Math.round(balance).toLocaleString("en-IN")}\n• Status: ${status}\n- Nirman Construction Management`;
  };

  const openWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const openNativeSMS = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    window.open(`sms:${cleanPhone}?body=${encodeURIComponent(message)}`, "_self");
  };

  const sendWeeklySMS = async () => {
    if (!FAST2SMS_KEY || FAST2SMS_KEY === "<your_fast2sms_api_key>") {
      toast.error("Add VITE_FAST2SMS_API_KEY to web/.env first");
      return;
    }
    setSending(true);
    let sent = 0, failed = 0, skipped = 0;
    let lastError = "";

    for (const { worker, totalDays, earned, balance } of payrollSummary) {
      if (!worker.phone) { skipped++; continue; }
      const phone = worker.phone.replace(/\D/g, "").slice(-10);
      if (phone.length !== 10) { skipped++; continue; }
      const message = getWorkerMessage(worker.full_name, totalDays, earned, balance).replace(/\*/g, "");
      const res = await sendSMS(phone, message);
      if (res.ok) {
        sent++;
      } else {
        failed++;
        if (res.error) lastError = res.error;
      }
    }

    setSending(false);
    if (sent > 0) toast.success(`SMS sent to ${sent} worker${sent > 1 ? "s" : ""}`);
    if (failed > 0) {
      toast.error(lastError ? `SMS gateway: ${lastError}` : `Failed for ${failed} worker${failed > 1 ? "s" : ""}`, { duration: 7000 });
    }
    if (skipped > 0) toast.info(`${skipped} worker${skipped > 1 ? "s" : ""} skipped (no phone number)`);
    if (sent === 0 && failed === 0 && skipped === payrollSummary.length) toast.error("No workers with valid phone numbers");
  };

  return (
    <div>
      <PageHeader
        title="Payments & Payroll"
        description={`Earned: ${formatINR(totalEarned, language)} • Paid: ${formatINR(totalPaid, language)} • Balance: ${formatINR(totalBalance, language)}`}
        action={
          <Button size="sm" onClick={sendWeeklySMS} disabled={sending} className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {sending ? "Sending..." : "Send Weekly SMS"}
          </Button>
        }
      />

      <div className="mb-4">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Earned</p>
          <p className="text-xl font-bold text-green-600">{formatINR(totalEarned, language)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Paid</p>
          <p className="text-xl font-bold text-blue-600">{formatINR(totalPaid, language)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Balance Due</p>
          <p className="text-xl font-bold text-amber-600">{formatINR(totalBalance, language)}</p>
        </CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Daily Wage</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollSummary.map(({ worker, totalDays, earned, paid, balance }) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.full_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {worker.phone ?? <span className="text-red-400">No phone</span>}
                    </TableCell>
                    <TableCell><ProjectCell projectId={worker.project_id} map={map} navigate={() => {}} /></TableCell>
                    <TableCell className="text-right">{totalDays}</TableCell>
                    <TableCell className="text-right">{formatINR(worker.daily_wage, language)}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(earned, language)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatINR(paid, language)}</TableCell>
                    <TableCell className="text-right font-bold text-amber-600">{formatINR(balance, language)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 justify-end">
                        {worker.phone && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Send free WhatsApp summary"
                              onClick={() => openWhatsApp(worker.phone!, getWorkerMessage(worker.full_name, totalDays, earned, balance))}
                            >
                              WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Send via mobile SMS app (free SIM plan)"
                              onClick={() => openNativeSMS(worker.phone!, getWorkerMessage(worker.full_name, totalDays, earned, balance).replace(/\*/g, ""))}
                            >
                              SMS
                            </Button>
                          </>
                        )}
                        {balance > 0 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid(worker.id, worker.project_id, balance)}>
                            Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="mb-3 text-sm font-semibold">Payment History</p>
      {payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments recorded yet" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{formatDate(p.payment_date, language)}</TableCell>
                  <TableCell className="font-medium">{p.workers?.full_name ?? "—"}</TableCell>
                  <TableCell><ProjectCell projectId={p.project_id} map={map} navigate={() => {}} /></TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(p.amount, language)}</TableCell>
                  <TableCell><Badge variant="secondary">{p.method ?? "cash"}</Badge></TableCell>
                  <TableCell><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

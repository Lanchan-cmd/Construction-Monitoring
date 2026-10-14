import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search, MapPin, IndianRupee, Calendar, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth, usePrefs, useMyProjectIds } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatINR, formatINRCompact, formatDate, todayISO } from "@/lib/format";
import type { Project, ProjectStatus, Profile } from "@/lib/types";
import { PageHeader, StatusBadge, ProgressBar, EmptyState } from "@/components/ui-widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const INDIAN_STATES = [
  "Karnataka", "Tamil Nadu", "Kerala", "Andhra Pradesh", "Telangana",
  "Maharashtra", "Gujarat", "Rajasthan", "Delhi", "Uttar Pradesh",
  "Madhya Pradesh", "West Bengal", "Bihar", "Odisha", "Punjab",
];

const PROJECT_STATUSES: ProjectStatus[] = ["planning", "active", "on_hold", "completed", "cancelled"];

export default function ProjectsPage() {
  const { profile } = useAuth();
  const { language } = usePrefs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const { ids: myProjectIds, isAdmin } = useMyProjectIds();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", profile?.role, profile?.id],
    queryFn: async () => {
      let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
      // Non-admin users only see their assigned projects
      if (!isAdmin && myProjectIds !== null) {
        if (myProjectIds.length === 0) return [] as Project[];
        query = query.in("id", myProjectIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
    enabled: isAdmin || myProjectIds !== null,
  });

  const { data: engineers = [] } = useQuery({
    queryKey: ["profiles", "engineer"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("role", "engineer").eq("is_active", true);
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ["profiles", "contractor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("role", "contractor").eq("is_active", true);
      if (error) throw error;
      return data as Profile[];
    },
  });

  const filtered = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.state ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canCreate = profile?.role === "admin" || profile?.role === "engineer";

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading", language)}</div>;
  }

  return (
    <div>
      <PageHeader
        title={t("nav.projects", language)}
        description={`${projects.length} ${t("nav.projects", language).toLowerCase()}`}
        action={
          canCreate && (
            <Button onClick={() => { setEditing(null); setCreateOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("project.new", language)}
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("common.search", language)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", language)}</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`status.${s}`, language)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("common.noData", language)}
          description={canCreate ? "Create your first construction project" : undefined}
          action={canCreate && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />{t("project.new", language)}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const budgetPct = p.budget > 0 ? Math.round((p.budget_used / p.budget) * 100) : 0;
            return (
              <Card
                key={p.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold">{p.name}</h3>
                      {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                    </div>
                    <StatusBadge status={p.status} label={t(`status.${p.status}`, language)} />
                  </div>

                  {/* Location */}
                  {p.state && (
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {[p.village, p.taluk, p.district, p.state].filter(Boolean).join(", ")}
                      {p.pin_code && ` - ${p.pin_code}`}
                    </div>
                  )}

                  {/* Budget */}
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("project.budget", language)}</p>
                      <p className="text-sm font-semibold">{formatINRCompact(p.budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("project.budgetUsed", language)}</p>
                      <p className="text-sm font-semibold">{formatINRCompact(p.budget_used)}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("project.progress", language)}</span>
                      <span className="font-semibold">{p.progress_percent}%</span>
                    </div>
                    <ProgressBar value={p.progress_percent} />
                  </div>

                  {/* Budget usage */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Budget Usage</span>
                      <span className="font-semibold">{budgetPct}%</span>
                    </div>
                    <ProgressBar value={budgetPct} />
                  </div>

                  {/* Dates */}
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    {p.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(p.start_date, language)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      {createOpen && (
        <ProjectFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          project={editing}
          engineers={engineers}
          contractors={contractors}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
        />
      )}
    </div>
  );
}

// ---------- Project form dialog ----------

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  engineers: Profile[];
  contractors: Profile[];
  onSaved: () => void;
}

function ProjectFormDialog({ open, onOpenChange, project, engineers, contractors, onSaved }: FormDialogProps) {
  const { profile, session } = useAuth();
  const { language } = usePrefs();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [budget, setBudget] = useState(project?.budget?.toString() ?? "4500000");
  const [gstPercent, setGstPercent] = useState(project?.gst_percent?.toString() ?? "18");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "planning");
  const [startDate, setStartDate] = useState(project?.start_date ?? todayISO());
  const [endDate, setEndDate] = useState(project?.end_date ?? "");
  const [state, setState] = useState(project?.state ?? "Karnataka");
  const [district, setDistrict] = useState(project?.district ?? "");
  const [taluk, setTaluk] = useState(project?.taluk ?? "");
  const [village, setVillage] = useState(project?.village ?? "");
  const [pinCode, setPinCode] = useState(project?.pin_code ?? "");
  const [engineerId, setEngineerId] = useState(project?.engineer_id ?? "none");
  const [contractorId, setContractorId] = useState(project?.contractor_id ?? "none");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !session?.user?.id) return;
    setSaving(true);

    const payload = {
      name,
      description: description || null,
      budget: parseFloat(budget) || 0,
      gst_percent: parseFloat(gstPercent) || 0,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      state: state || null,
      district: district || null,
      taluk: taluk || null,
      village: village || null,
      pin_code: pinCode || null,
      engineer_id: engineerId === "none" ? null : engineerId,
      contractor_id: contractorId === "none" ? null : contractorId,
    };

    if (project) {
      const { error } = await supabase.from("projects").update(payload).eq("id", project.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Project updated");
    } else {
      const { error } = await supabase.from("projects").insert({ ...payload, created_by: session.user.id });
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Project created");
    }

    onSaved();
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? t("project.edit", language) : t("project.new", language)}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("project.name", language)} *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Residential Building - Bengaluru" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">{t("project.description", language)}</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="3-storey residential apartment with 12 flats" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="budget">{t("project.budget", language)} (₹) *</Label>
              <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} required min="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gst">{t("project.gst", language)}</Label>
              <Input id="gst" type="number" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} min="0" max="28" step="0.01" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start">{t("project.startDate", language)}</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">{t("project.endDate", language)}</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* India-specific location */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-3 text-sm font-semibold">{t("project.location", language)}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="state">{t("project.state", language)}</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger id="state"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="district">{t("project.district", language)}</Label>
                <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bengaluru Urban" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taluk">{t("project.taluk", language)}</Label>
                <Input id="taluk" value={taluk} onChange={(e) => setTaluk(e.target.value)} placeholder="Bengaluru North" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="village">{t("project.village", language)}</Label>
                <Input id="village" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Yelahanka" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin">{t("project.pinCode", language)}</Label>
                <Input id="pin" value={pinCode} onChange={(e) => setPinCode(e.target.value)} placeholder="560064" maxLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("project.status", language)}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`, language)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Assignments */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("project.assignEngineer", language)}</Label>
              <Select value={engineerId} onValueChange={setEngineerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {engineers.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name || e.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("project.assignContractor", language)}</Label>
              <Select value={contractorId} onValueChange={setContractorId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", language)}</Button>
            <Button type="submit" disabled={saving}>{saving ? t("common.loading", language) : t("common.save", language)}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart, FileText, FileSpreadsheet, Building2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GradientBarChart, GradientAreaChart } from "@/components/charts";
import { supabase } from "@/lib/supabase";
import { useAuth, usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatINR, formatINRCompact, formatDate, todayISO } from "@/lib/format";
import type { Project, Expense, DailyProgress, Worker, AttendanceRecord } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/ui-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ReportsPage() {
  const { profile } = useAuth();
  const { language } = usePrefs();
  const [projectId, setProjectId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(todayISO());

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("name");
      if (error) throw error;
      return data as Project[];
    },
  });

  // Fetch expenses for the selected project
  const { data: expenses = [] } = useQuery({
    queryKey: ["report-expenses", projectId, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("expenses").select("*").order("expense_date", { ascending: true });
      if (projectId !== "all") query = query.eq("project_id", projectId);
      if (dateFrom) query = query.gte("expense_date", dateFrom);
      if (dateTo) query = query.lte("expense_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["report-progress", projectId, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("daily_progress").select("*").order("log_date", { ascending: true });
      if (projectId !== "all") query = query.eq("project_id", projectId);
      if (dateFrom) query = query.gte("log_date", dateFrom);
      if (dateTo) query = query.lte("log_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data as DailyProgress[];
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["report-workers", projectId],
    queryFn: async () => {
      let query = supabase.from("workers").select("*");
      if (projectId !== "all") query = query.eq("project_id", projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Worker[];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["report-attendance", projectId, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("attendance").select("*");
      if (projectId !== "all") query = query.eq("project_id", projectId);
      if (dateFrom) query = query.gte("date", dateFrom);
      if (dateTo) query = query.lte("date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  // Calculate summary stats
  const totalExpenses = expenses.reduce((sum, e) => sum + e.total_amount, 0);
  const totalGst = expenses.reduce((sum, e) => sum + e.gst_amount, 0);
  const presentCount = attendance.filter((a) => a.status === "present").length;
  const halfDayCount = attendance.filter((a) => a.status === "half_day").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;

  // Expense by category chart data
  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.total_amount;
    return acc;
  }, {});
  const categoryData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

  // Progress trend
  const progressData = progress.map((p) => ({ date: formatDate(p.log_date, language), progress: p.progress_percent }));

  const downloadCsv = (rows: string[][], filename: string) => {
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV export — expenses
  const exportCsv = () => {
    const rows = [
      ["Date", "Category", "Description", "Amount", "GST %", "GST Amount", "Total"],
      ...expenses.map((e) => [e.expense_date, e.category, e.description ?? "", e.amount.toString(), e.gst_percent.toString(), e.gst_amount.toString(), e.total_amount.toString()]),
    ];
    downloadCsv(rows, `nirman-expenses-${todayISO()}.csv`);
    toast.success("Expenses CSV exported");
  };

  // CSV export — attendance
  const exportAttendanceCsv = () => {
    const workerMap = Object.fromEntries(workers.map((w) => [w.id, w.full_name]));
    const rows = [
      ["Date", "Worker", "Status", "Hours Worked"],
      ...attendance.map((a) => [a.date, workerMap[a.worker_id] ?? a.worker_id, a.status, (a.hours_worked ?? 0).toString()]),
    ];
    downloadCsv(rows, `nirman-attendance-${todayISO()}.csv`);
    toast.success("Attendance CSV exported");
  };

  // PDF export using jsPDF
  const exportPdf = () => {
    const doc = new jsPDF();
    const selectedProject = projects.find((p) => p.id === projectId);
    const title = selectedProject ? `Project Report: ${selectedProject.name}` : "Nirman — All Projects Report";

    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 26);
    doc.text(`Period: ${dateFrom || "All time"} to ${dateTo}`, 14, 32);

    // Summary
    doc.setFontSize(12);
    doc.text("Summary", 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [["Metric", "Value"]],
      body: [
        ["Total Expenses", formatINR(totalExpenses, language)],
        ["Total GST", formatINR(totalGst, language)],
        ["Total Workers", workers.length.toString()],
        ["Present Days", presentCount.toString()],
        ["Absent Days", absentCount.toString()],
      ],
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11] },
    });

    // Expenses table
    const afterSummary = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Expense Breakdown", 14, afterSummary);
    autoTable(doc, {
      startY: afterSummary + 4,
      head: [["Date", "Category", "Description", "Amount (₹)", "GST (₹)", "Total (₹)"]],
      body: expenses.map((e) => [
        e.expense_date,
        e.category,
        e.description ?? "—",
        e.amount.toLocaleString("en-IN"),
        e.gst_amount.toLocaleString("en-IN"),
        e.total_amount.toLocaleString("en-IN"),
      ]),
      foot: [["Total", "", "",
        expenses.reduce((s, e) => s + e.amount, 0).toLocaleString("en-IN"),
        totalGst.toLocaleString("en-IN"),
        totalExpenses.toLocaleString("en-IN"),
      ]],
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11] },
      footStyles: { fillColor: [254, 243, 199], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    doc.save(`nirman-report-${todayISO()}.pdf`);
    toast.success("PDF report downloaded");
  };

  if (profile?.role !== "admin" && profile?.role !== "engineer") {
    return <EmptyState icon={FileBarChart} title="Access denied" description="Only admins and engineers can view reports" />;
  }

  return (
    <div>
      <PageHeader
        title={t("nav.reports", language)}
        description={t("report.projectReport", language)}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportAttendanceCsv} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              Attendance CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              {t("report.exportCsv", language)}
            </Button>
            <Button size="sm" onClick={exportPdf} className="gap-1.5">
              <FileText className="h-4 w-4" />
              {t("report.exportPdf", language)}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{t("nav.projects", language)}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", language)}</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From Date</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To Date</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="text-xl font-bold">{formatINR(totalExpenses, language)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total GST</p>
          <p className="text-xl font-bold">{formatINR(totalGst, language)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Workers</p>
          <p className="text-xl font-bold">{workers.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Attendance Records</p>
          <p className="text-xl font-bold">{attendance.length}</p>
          <p className="text-xs text-muted-foreground">P:{presentCount} H:{halfDayCount} A:{absentCount}</p>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">Expenses by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <EmptyState icon={FileBarChart} title={t("common.noData", language)} />
            ) : (
              <GradientBarChart
                data={categoryData}
                bars={[{ key: "value", color: "#f59e0b", label: "Amount" }]}
                height={300}
                formatter={(v) => formatINRCompact(v)}
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-card shadow-card">
          <CardHeader><CardTitle className="text-base">Progress Trend</CardTitle></CardHeader>
          <CardContent>
            {progressData.length === 0 ? (
              <EmptyState icon={FileBarChart} title={t("common.noData", language)} />
            ) : (
              <GradientAreaChart data={progressData} dataKey="progress" xKey="date" color="#f59e0b" height={300} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense breakdown table */}
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <EmptyState icon={Building2} title={t("common.noData", language)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Category</th>
                    <th className="pb-2 pr-4">Description</th>
                    <th className="pb-2 pr-4 text-right">Amount</th>
                    <th className="pb-2 pr-4 text-right">GST</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap text-xs">{formatDate(e.expense_date, language)}</td>
                      <td className="py-2 pr-4"><span className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.category}</span></td>
                      <td className="py-2 pr-4 text-muted-foreground">{e.description ?? "—"}</td>
                      <td className="py-2 pr-4 text-right">{formatINR(e.amount, language)}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{formatINR(e.gst_amount, language)}</td>
                      <td className="py-2 text-right font-semibold">{formatINR(e.total_amount, language)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={3} className="pt-3">Total</td>
                    <td className="pt-3 text-right">{formatINR(expenses.reduce((s, e) => s + e.amount, 0), language)}</td>
                    <td className="pt-3 text-right">{formatINR(totalGst, language)}</td>
                    <td className="pt-3 text-right">{formatINR(totalExpenses, language)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

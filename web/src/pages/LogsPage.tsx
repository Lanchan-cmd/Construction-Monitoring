import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth, usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import type { SystemLog, Profile } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/ui-widgets";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function LogsPage() {
  const { profile } = useAuth();
  const { language } = usePrefs();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["system-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as SystemLog[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data as Pick<Profile, "id" | "full_name" | "email">[];
    },
  });

  const profileName = (id: string | null) => {
    if (!id) return "System";
    const p = profiles.find((p) => p.id === id);
    return p?.full_name || p?.email || "Unknown";
  };

  if (profile?.role !== "admin") {
    return <EmptyState icon={ScrollText} title="Access denied" description="Only administrators can view system logs" />;
  }

  const actions = [...new Set(logs.map((l) => l.action))];
  const filtered = logs.filter((l) => {
    const matchesSearch = l.action.toLowerCase().includes(search.toLowerCase()) || (l.details && JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase()));
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div>
      <PageHeader title={t("nav.logs", language)} description={`${logs.length} log entries`} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("common.search", language)} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", language)}</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">{t("common.loading", language)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title={t("common.noData", language)} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(log.created_at, language)}</TableCell>
                  <TableCell><Badge variant="secondary">{log.action}</Badge></TableCell>
                  <TableCell className="text-sm">{profileName(log.actor_id)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.entity_type ? `${log.entity_type}${log.entity_id ? `: ${log.entity_id.slice(0, 8)}` : ""}` : "—"}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate font-mono text-xs text-muted-foreground">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

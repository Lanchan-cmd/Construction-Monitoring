import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui-widgets";
import { RoleBadge } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { Profile, UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["engineer", "contractor", "owner", "supervisor", "labour"];

export default function UsersPage() {
  const { language } = usePrefs();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Profile> }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(t("common.success", language));
    },
    onError: () => toast.error(t("common.error", language)),
  });

  const filtered = users.filter(
    (u) =>
      u.role !== "admin" &&
      (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <PageHeader title={t("nav.users", language)} description="Manage user roles and access" />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("common.search", language)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">{t("common.loading", language)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title={t("common.noData", language)} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Active</th>
                    <th className="px-4 py-3 text-left font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{user.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={user.role}
                          onValueChange={(role) =>
                            updateUser.mutate({ id: user.id, patch: { role: role as UserRole } })
                          }
                        >
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue>
                              <RoleBadge role={user.role} language={language} />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                <RoleBadge role={r} language={language} />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={(checked) =>
                            updateUser.mutate({ id: user.id, patch: { is_active: checked } })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

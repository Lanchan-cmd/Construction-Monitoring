import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, Sun, Moon, Globe, LogOut, User, Mail, Phone, Shield } from "lucide-react";
import { useAuth, usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { language, theme, setLanguage, toggleTheme } = usePrefs();
  const navigate = useNavigate();

  if (!profile) return null;

  const initials = profile.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("nav.settings", language)} />

      {/* Profile card */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">{t("settings.profile", language)}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profile.full_name || "User"}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{t(`role.${profile.role}`, language)}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("auth.email", language)}</p>
                <p className="truncate text-sm font-medium">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("auth.phone", language)}</p>
                <p className="truncate text-sm font-medium">{profile.phone ?? "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label>{t("settings.language", language)}</Label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage("en")}
                className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", language === "en" ? "bg-primary text-primary-foreground" : "border hover:bg-muted")}
              >
                {t("settings.english", language)}
              </button>
              <button
                onClick={() => setLanguage("kn")}
                className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", language === "kn" ? "bg-primary text-primary-foreground" : "border hover:bg-muted")}
              >
                {t("settings.kannada", language)}
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "light" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
              <Label>{t("settings.theme", language)}</Label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => theme === "dark" && toggleTheme()}
                className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", theme === "light" ? "bg-primary text-primary-foreground" : "border hover:bg-muted")}
              >
                {t("settings.light", language)}
              </button>
              <button
                onClick={() => theme === "light" && toggleTheme()}
                className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", theme === "dark" ? "bg-primary text-primary-foreground" : "border hover:bg-muted")}
              >
                {t("settings.dark", language)}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t("auth.logout", language)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

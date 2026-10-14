import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Building2, Users, Package, HardHat,
  CalendarCheck, Receipt, ListTodo, AlertTriangle, FileBarChart,
  ScrollText, Settings, Images, Construction, LogOut, Sun, Moon,
  Globe, ChevronDown, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/",          icon: LayoutDashboard, labelKey: "nav.dashboard", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/projects",  icon: Building2,       labelKey: "nav.projects",  roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/users",     icon: Users,           labelKey: "nav.users",     roles: ["admin"] },
  { to: "/materials", icon: Package,         labelKey: "nav.materials", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/labour",    icon: HardHat,         labelKey: "nav.labour",    roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/attendance",icon: CalendarCheck,   labelKey: "nav.attendance",roles: ["admin", "engineer", "contractor"] },
  { to: "/expenses",  icon: Receipt,         labelKey: "nav.expenses",  roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/tasks",     icon: ListTodo,        labelKey: "nav.tasks",     roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/issues",    icon: AlertTriangle,   labelKey: "nav.issues",    roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/photos",    icon: Images,          labelKey: "nav.photos",    roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/payments",  icon: Receipt,         labelKey: "nav.payments",  roles: ["admin", "engineer", "owner"] },
  { to: "/reports",   icon: FileBarChart,    labelKey: "nav.reports",   roles: ["admin", "engineer", "owner"] },
  { to: "/logs",      icon: ScrollText,      labelKey: "nav.logs",      roles: ["admin"] },
  { to: "/settings",  icon: Settings,        labelKey: "nav.settings",  roles: ["admin", "engineer", "contractor", "owner"] },
];

const ROLE_COLORS: Record<UserRole, string> = {
  admin:      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  engineer:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  contractor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  owner:      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  supervisor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  labour:     "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const ROLE_BANNER: Record<UserRole, string> = {
  admin:      "bg-red-600/20 text-red-400",
  engineer:   "bg-blue-600/20 text-blue-400",
  contractor: "bg-amber-600/20 text-amber-400",
  owner:      "bg-purple-600/20 text-purple-400",
  supervisor: "bg-green-600/20 text-green-400",
  labour:     "bg-gray-600/20 text-gray-400",
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { language, theme, setLanguage, toggleTheme } = usePrefs();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!profile) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));
  const initials = profile.full_name
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Construction className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold tracking-tight truncate">{t("app.name", language)}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{t("app.tagline", language)}</p>
          </div>
          <button
            className="lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role accent banner */}
        <div className={cn(
          "px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-b border-sidebar-border",
          ROLE_BANNER[profile.role]
        )}>
          {t(`role.${profile.role}`, language)} Dashboard
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {t(item.labelKey, language)}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User card */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent transition-colors cursor-default">
            <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
              <AvatarFallback className="bg-primary/20 text-xs font-bold text-primary">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{profile.full_name || profile.email}</p>
              <span className={cn("inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize", ROLE_COLORS[profile.role])}>
                {t(`role.${profile.role}`, language)}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4 lg:px-6 sticky top-0 z-30">
          <button
            className="lg:hidden text-foreground/70 hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-medium">{language === "en" ? "EN" : "ಕನ"}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setLanguage("en")}>{t("settings.english", language)}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("kn")}>{t("settings.kannada", language)}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                    {initials || "?"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>
                <p className="text-sm font-semibold">{profile.full_name || "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                <Badge variant="secondary" className="mt-1.5 capitalize text-[10px]">{t(`role.${profile.role}`, language)}</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-lg">
                <Settings className="mr-2 h-4 w-4" />
                {t("nav.settings", language)}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive rounded-lg">
                <LogOut className="mr-2 h-4 w-4" />
                {t("auth.logout", language)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

export function RoleBadge({ role, language }: { role: UserRole; language: "en" | "kn" }) {
  return (
    <span className={cn("inline-block rounded-md px-2 py-0.5 text-xs font-semibold capitalize", ROLE_COLORS[role])}>
      {t(`role.${role}`, language)}
    </span>
  );
}

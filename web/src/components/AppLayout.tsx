import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  HardHat,
  CalendarCheck,
  Receipt,
  ListTodo,
  AlertTriangle,
  FileBarChart,
  ScrollText,
  Settings,
  Images,
  Construction,
  LogOut,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  roles: UserRole[];
}

/** Navigation items with role gating. */
const NAV_ITEMS: NavItem[] = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/projects", icon: Building2, labelKey: "nav.projects", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/users", icon: Users, labelKey: "nav.users", roles: ["admin"] },
  { to: "/materials", icon: Package, labelKey: "nav.materials", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/labour", icon: HardHat, labelKey: "nav.labour", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/attendance", icon: CalendarCheck, labelKey: "nav.attendance", roles: ["admin", "engineer", "contractor"] },
  { to: "/expenses", icon: Receipt, labelKey: "nav.expenses", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/tasks", icon: ListTodo, labelKey: "nav.tasks", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/issues", icon: AlertTriangle, labelKey: "nav.issues", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/photos", icon: Images, labelKey: "nav.photos", roles: ["admin", "engineer", "contractor", "owner"] },
  { to: "/payments", icon: Receipt, labelKey: "nav.payments", roles: ["admin", "engineer", "owner"] },
  { to: "/reports", icon: FileBarChart, labelKey: "nav.reports", roles: ["admin", "engineer", "owner"] },
  { to: "/logs", icon: ScrollText, labelKey: "nav.logs", roles: ["admin"] },
  { to: "/settings", icon: Settings, labelKey: "nav.settings", roles: ["admin", "engineer", "contractor", "owner"] },
];

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  engineer: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  contractor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  supervisor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  labour: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
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
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — desktop fixed + mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Construction className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold tracking-tight">{t("app.name", language)}</p>
            <p className="text-[11px] text-sidebar-foreground/60">{t("app.tagline", language)}</p>
          </div>
          <button
            className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
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
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar className="h-8 w-8 border border-sidebar-border">
              <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{profile.full_name || profile.email}</p>
              <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize", ROLE_COLORS[profile.role])}>
                {t(`role.${profile.role}`, language)}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <button
            className="lg:hidden text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Language switch */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{language === "en" ? "EN" : "ಕನ"}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("en")}>
                {t("settings.english", language)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("kn")}>
                {t("settings.kannada", language)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {/* Profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials || "?"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{profile.full_name || "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                <Badge variant="secondary" className="mt-1.5 capitalize">{t(`role.${profile.role}`, language)}</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                {t("nav.settings", language)}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("auth.logout", language)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

/** Role badge component for tables/cards. */
export function RoleBadge({ role, language }: { role: UserRole; language: "en" | "kn" }) {
  return (
    <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-semibold capitalize", ROLE_COLORS[role])}>
      {t(`role.${role}`, language)}
    </span>
  );
}

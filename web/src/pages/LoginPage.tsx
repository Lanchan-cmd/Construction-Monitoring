import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Construction, Mail, Lock, User, Phone, ArrowRight, HardHat } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/auth";
import { t } from "@/lib/i18n";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Admin role is reserved — only assigned internally. Public signup roles:
const ROLES: { value: UserRole; labelKey: string; icon: typeof HardHat }[] = [
  { value: "owner", labelKey: "role.owner", icon: HardHat },
  { value: "engineer", labelKey: "role.engineer", icon: HardHat },
  { value: "contractor", labelKey: "role.contractor", icon: HardHat },
];

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { language, setLanguage } = usePrefs();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("engineer");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(t("auth.invalidCredentials", language));
        setSubmitting(false);
        return;
      }
      toast.success(t("common.success", language));
      navigate("/");
    } else {
      if (password !== confirmPassword) {
        toast.error(t("auth.passwordMismatch", language));
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, role, phone);
      if (error) {
        toast.error(error);
        setSubmitting(false);
        return;
      }
      toast.success("Account created! Check your email for confirmation, then sign in.");
      setMode("login");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="relative flex flex-col justify-between bg-sidebar p-8 text-sidebar-foreground lg:w-[42%] lg:p-12">
        <div className="bg-blueprint absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Construction className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t("app.name", language)}</h1>
              <p className="text-xs text-sidebar-foreground/60">{t("app.tagline", language)}</p>
            </div>
          </div>
        </div>

        <div className="relative my-12 lg:my-0">
          <h2 className="max-w-sm text-3xl font-bold leading-tight lg:text-4xl">
            Build smarter.
            <br />
            <span className="text-gradient-amber">Monitor everything.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/70">
            Track projects, labour, materials, and budgets in real time. Designed for the Indian construction industry — with ₹ currency, GST, and Kannada support.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: "Projects", value: "Real-time tracking" },
              { label: "Labour", value: "Attendance & payroll" },
              { label: "Materials", value: "Inventory & GST" },
              { label: "Reports", value: "PDF & CSV export" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-sidebar-border/50 bg-sidebar-accent/40 p-3">
                <p className="text-xs text-sidebar-foreground/50">{item.label}</p>
                <p className="text-sm font-semibold text-sidebar-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-sidebar-foreground/40">
          © 2026 Nirman — Construction Monitoring System
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Language toggle */}
          <div className="mb-8 flex justify-end gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={cn("rounded-md px-3 py-1 text-sm font-medium transition-colors", language === "en" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("kn")}
              className={cn("rounded-md px-3 py-1 text-sm font-medium transition-colors", language === "kn" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              ಕನ್ನಡ
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "login" ? t("auth.loginTitle", language) : t("auth.signupTitle", language)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? t("auth.loginSubtitle", language) : t("auth.signupSubtitle", language)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">{t("auth.fullName", language)}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-10"
                      placeholder="Rajesh Kumar"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("auth.phone", language)}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{t("auth.selectRole", language)}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => {
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRole(r.value)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all",
                            role === r.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {t(r.labelKey, language)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email", language)}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password", language)}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword", language)}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full gap-2" size="lg">
              {submitting
                ? mode === "login"
                  ? t("auth.signingIn", language)
                  : t("auth.signingUp", language)
                : mode === "login"
                  ? t("auth.login", language)
                  : t("auth.signup", language)}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? t("auth.noAccount", language) : t("auth.haveAccount", language)}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "login" ? t("auth.signup", language) : t("auth.login", language)}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

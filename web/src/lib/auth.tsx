import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole, Language } from "@/lib/types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, phone?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Auth provider: manages Supabase session and the user's profile row.
 * The profile carries the role (admin/engineer/contractor/etc.) and
 * preferred language, which gate the UI throughout the app.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("Failed to fetch profile:", error.message.replace(/[\r\n]/g, " "));
      return;
    }
    setProfile(data as Profile);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, profile: null };
    // Fetch profile so the caller can validate the role
    const userId = data.user?.id;
    if (!userId) return { error: null, profile: null };
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).single();
    return { error: null, profile: prof as Profile | null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role: UserRole, phone?: string) => {
      // Creator's email always gets admin role regardless of what was selected
      const ADMIN_EMAIL = "nirmanadmin01@gmail.com";
      const assignedRole: UserRole = email.toLowerCase() === ADMIN_EMAIL ? "admin" : role;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: assignedRole } },
      });
      if (error) return { error: error.message };

      // Update profile — works whether email confirmation is on or off
      const userId = data.user?.id ?? data.session?.user?.id;
      if (userId) {
        await supabase
          .from("profiles")
          .upsert({ id: userId, email, full_name: fullName, role: assignedRole, phone: phone ?? null })
          .eq("id", userId);
      }
      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ---------- App preferences (language + theme) ----------

interface PrefsState {
  language: Language;
  theme: "light" | "dark";
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
}

const PrefsContext = createContext<PrefsState | undefined>(undefined);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("nirman-lang") as Language | null;
    return stored ?? "en";
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("nirman-theme") as "light" | "dark" | null;
    return stored ?? "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("nirman-theme", theme);
  }, [theme]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("nirman-lang", lang);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <PrefsContext.Provider value={{ language, theme, setLanguage, toggleTheme }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs(): PrefsState {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}

// ---------- Scoped project IDs for the current user ----------
//
// Returns the list of project IDs the current user is allowed to see:
//   - admin      → null  (caller should fetch all, no filter)
//   - engineer   → projects where engineer_id = profile.id
//   - contractor → projects where contractor_id = profile.id
//   - owner      → projects where created_by = profile.id
//
// Use .in("project_id", ids) in every scoped query.
// When the array is empty the user has no assigned projects.

export function useMyProjectIds(): { ids: string[] | null; isAdmin: boolean; loading: boolean } {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { data: ids = [], isLoading } = useQuery({
    queryKey: ["my-project-ids", profile?.role, profile?.id],
    enabled: !!profile && !isAdmin,
    queryFn: async () => {
      if (!profile) return [];
      let query = supabase.from("projects").select("id");
      if (profile.role === "engineer")   query = query.eq("engineer_id",   profile.id);
      if (profile.role === "contractor") query = query.eq("contractor_id", profile.id);
      if (profile.role === "owner")      query = query.eq("created_by",    profile.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((p: { id: string }) => p.id);
    },
  });

  return { ids: isAdmin ? null : ids, isAdmin, loading: !isAdmin && isLoading };
}

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "missionary" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  approved: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [approved, setApproved] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndApproval = async (userId: string) => {
    try {
      const [roleRes, profileRes] = await Promise.all([
        supabase.rpc("get_user_role", { _user_id: userId }),
        supabase.from("profiles").select("approved").eq("id", userId).single(),
      ]);
      // Nunca chamamos signOut aqui — só setamos o que vier, sem punir o usuário
      setRole((roleRes.data as AppRole) || null);
      setApproved(profileRes.data?.approved ?? true);
    } catch (error) {
      // Em caso de falha de rede ou timeout, deixamos role = null mas NUNCA fazemos signOut
      // O ProtectedRoute vai mostrar tela de erro com botão "Tentar Novamente"
      setRole(null);
    }
  };

  useEffect(() => {
    // O padrão recomendado pelo Supabase: escutar onAuthStateChange PRIMEIRO,
    // depois chamar getSession — isso evita o race condition de lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Usa setTimeout(0) para deixar o Supabase finalizar a troca de token antes de buscar o perfil.
          // Isso evita completamente o AbortError de Lock concorrente.
          setTimeout(() => {
            fetchRoleAndApproval(currentSession.user.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setRole(null);
          setApproved(true);
          setLoading(false);
        }
      }
    );

    // Dispara a leitura inicial da sessão existente
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      // onAuthStateChange já vai disparar INITIAL_SESSION; se não houver sessão, desligamos o loading aqui
      if (!initialSession) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setApproved(true);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, approved, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

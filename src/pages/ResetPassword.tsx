import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-jfm.png";
import { Lock } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada!", description: "Sua senha foi alterada com sucesso." });
      navigate("/dashboard");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-warm px-6">
        <img src={logo} alt="JFM" className="h-16 w-16 rounded-xl mb-4" />
        <p className="text-muted-foreground text-center">
          Link inválido ou expirado. Solicite uma nova redefinição de senha.
        </p>
        <Button className="mt-4" onClick={() => navigate("/")}>
          Voltar ao login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gradient-warm">
      <div className="gradient-mission flex flex-col items-center pt-12 pb-10 px-6 rounded-b-[2.5rem]">
        <img src={logo} alt="JFM" className="h-20 w-20 rounded-2xl bg-primary-foreground/10 p-1 object-contain mb-4" />
        <h1 className="text-xl font-display font-bold text-primary-foreground text-center">
          Redefinir Senha
        </h1>
      </div>

      <div className="flex-1 px-6 -mt-6">
        <div className="bg-card rounded-2xl shadow-elevated p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-foreground font-display">Nova senha</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Digite sua nova senha abaixo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full gradient-mission text-primary-foreground font-semibold h-12 text-base"
              disabled={loading}
            >
              {loading ? "Aguarde..." : "Redefinir Senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

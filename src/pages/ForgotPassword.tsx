import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-jfm.png";
import { Mail, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col gradient-warm">
      <div className="gradient-mission flex flex-col items-center pt-12 pb-10 px-6 rounded-b-[2.5rem]">
        <img src={logo} alt="JFM" className="h-20 w-20 rounded-2xl bg-primary-foreground/10 p-1 object-contain mb-4" />
        <h1 className="text-xl font-display font-bold text-primary-foreground text-center">
          Recuperar Senha
        </h1>
      </div>

      <div className="flex-1 px-6 -mt-6">
        <div className="bg-card rounded-2xl shadow-elevated p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail size={28} className="text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground font-display">E-mail enviado!</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.
              </p>
              <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
                <ArrowLeft size={16} /> Voltar ao login
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Mail size={20} className="text-primary" />
                <h2 className="text-lg font-bold text-foreground font-display">Esqueceu a senha?</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-mission text-primary-foreground font-semibold h-12 text-base"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-primary transition-colors gap-1 inline-flex items-center">
                  <ArrowLeft size={14} /> Voltar ao login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

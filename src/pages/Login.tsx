import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-jfm.png";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { settings } = useAppSettings();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Erro ao entrar", description: error, variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error, variant: "destructive" });
      } else {
        toast({
          title: "Conta criada!",
          description: "Verifique seu e-mail para confirmar o cadastro.",
        });
        setIsLogin(true);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col gradient-warm">
      {/* Hero */}
      <div className="gradient-mission flex flex-col items-center pt-12 pb-10 px-6 rounded-b-[2.5rem]">
        <img src={logo} alt="Juventude e Família Missionária" className="h-24 w-24 rounded-2xl bg-primary-foreground/10 p-1 object-contain mb-4 animate-fade-in" />
        <h1 className="text-2xl font-display font-bold text-primary-foreground text-center animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Juventude e Família<br />Missionária
        </h1>
        <p className="text-primary-foreground/70 text-sm mt-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {settings.login_subtitle}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 -mt-6">
        <div className="bg-card rounded-2xl shadow-elevated p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-xl font-bold text-foreground mb-1 font-display">
            {isLogin ? "Entrar" : "Criar Conta"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {isLogin ? "Acesse sua conta de missionário" : "Cadastre-se como missionário"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
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
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full gradient-mission text-primary-foreground font-semibold h-12 text-base"
              disabled={loading}
            >
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {isLogin && (
              <button
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                Esqueceu a senha?
              </button>
            )}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Não tem conta? " : "Já tem conta? "}
              <span className="font-bold text-primary">{isLogin ? "Cadastre-se" : "Entrar"}</span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground py-6">
        © 2026 Juventude e Família Missionária
      </p>
    </div>
  );
};

export default Login;

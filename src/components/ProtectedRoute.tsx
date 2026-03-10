import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin";
  requireApproval?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, requireApproval }: ProtectedRouteProps) => {
  const { user, role, approved, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (!role) {
    // Caso de edge-case / fallback do AuthContext: usuário está logado mas falhou a busca no DB
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="bg-card rounded-2xl shadow-elevated p-8 max-w-sm text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Erro de Conexão</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Não conseguimos resgatar as informações do seu perfil. Verifique sua internet, ou o servidor pode estar temporariamente fora do ar.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireApproval && !approved && role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

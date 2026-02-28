import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Calendario from "./pages/Calendario";
import Materiais from "./pages/Materiais";
import Galeria from "./pages/Galeria";
import Mapa from "./pages/Mapa";
import Admin from "./pages/Admin";
import Loja from "./pages/Loja";
import Familia from "./pages/Familia";
import Pesquisas from "./pages/Pesquisas";
import Perfil from "./pages/Perfil";
import Formacao from "./pages/Formacao";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
            <Route path="/materiais" element={<ProtectedRoute><Materiais /></ProtectedRoute>} />
            <Route path="/galeria" element={<ProtectedRoute><Galeria /></ProtectedRoute>} />
            <Route path="/mapa" element={<ProtectedRoute><Mapa /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/loja" element={<ProtectedRoute><Loja /></ProtectedRoute>} />
            <Route path="/familia" element={<ProtectedRoute><Familia /></ProtectedRoute>} />
            <Route path="/pesquisas" element={<ProtectedRoute><Pesquisas /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/formacao" element={<ProtectedRoute><Formacao /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

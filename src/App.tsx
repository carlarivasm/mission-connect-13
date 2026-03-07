import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Calendario from "./pages/Calendario";
import Materiais from "./pages/Materiais";
import Galeria from "./pages/Galeria";
import Mapa from "./pages/Mapa";
import Admin from "./pages/Admin";
import Loja from "./pages/Loja";
import Checkout from "./pages/Checkout";
import Familia from "./pages/Familia";
import Pesquisas from "./pages/Pesquisas";
import Perfil from "./pages/Perfil";
import Organograma from "./pages/Organograma";
import PushNotificationManager from "@/components/PushNotificationManager";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppSettingsProvider>
            <CartProvider>
            <PushNotificationManager />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
              <Route path="/materiais" element={<ProtectedRoute><Materiais /></ProtectedRoute>} />
              <Route path="/galeria" element={<ProtectedRoute><Galeria /></ProtectedRoute>} />
              <Route path="/mapa" element={<ProtectedRoute><Mapa /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/loja" element={<ProtectedRoute><Loja /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/familia" element={<ProtectedRoute><Familia /></ProtectedRoute>} />
              <Route path="/pesquisas" element={<ProtectedRoute><Pesquisas /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/organograma" element={<ProtectedRoute><Organograma /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </CartProvider>
          </AppSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

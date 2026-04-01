import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, BookOpen, MapPin, ShoppingBag, ClipboardList, Heart, Settings, FileText, Network, ShoppingCart, Megaphone, Image, BarChart3 } from "lucide-react";
import ManageMissionaries from "@/components/admin/ManageMissionaries";
import ManageEvents from "@/components/admin/ManageEvents";
import ManageMaterials from "@/components/admin/ManageMaterials";
import ManageLocations from "@/components/admin/ManageLocations";
import ManageStore from "@/components/admin/ManageStore";
import ManageSurveys from "@/components/admin/ManageSurveys";
import ManageFamilies from "@/components/admin/ManageFamilies";

import ManageAppSettings from "@/components/admin/ManageAppSettings";
import ManageLocationNotes from "@/components/admin/ManageLocationNotes";
import ManageOrgChart from "@/components/admin/ManageOrgChart";
import ManageOrders from "@/components/admin/ManageOrders";
import AdminBroadcast from "@/components/admin/AdminBroadcast";
import ManageBanners from "@/components/admin/ManageBanners";
import ManageAnalytics from "@/components/admin/ManageAnalytics";

const Admin = () => {
  const navigate = useNavigate();
  const { signOut, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [role, loading, navigate]);

  if (loading || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Painel Admin" onLogout={handleLogout} />

      <main className="px-4 py-5">
        <Tabs defaultValue="missionaries" className="w-full">
          <TabsList className="w-full h-auto p-1 grid grid-cols-4 mb-2 gap-1">
            <TabsTrigger value="missionaries" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <Users size={16} className="shrink-0" />
              <span className="text-center leading-tight">Missionários</span>
            </TabsTrigger>
            <TabsTrigger value="families" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <Heart size={16} className="shrink-0" />
              <span className="text-center leading-tight">Famílias</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <Calendar size={16} className="shrink-0" />
              <span className="text-center leading-tight">Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <BookOpen size={16} className="shrink-0" />
              <span className="text-center leading-tight">Materiais</span>
            </TabsTrigger>
          </TabsList>
          <TabsList className="w-full h-auto p-1 grid grid-cols-4 mb-2 gap-1">
            <TabsTrigger value="locations" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <MapPin size={16} className="shrink-0" />
              <span className="text-center leading-tight">Locais</span>
            </TabsTrigger>
            <TabsTrigger value="location-notes" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <FileText size={16} className="shrink-0" />
              <span className="text-center leading-tight">Observações</span>
            </TabsTrigger>
            <TabsTrigger value="store" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <ShoppingBag size={16} className="shrink-0" />
              <span className="text-center leading-tight">Loja</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <ShoppingCart size={16} className="shrink-0" />
              <span className="text-center leading-tight">Pedidos</span>
            </TabsTrigger>
          </TabsList>
          <TabsList className="w-full h-auto p-1 grid grid-cols-4 mb-2 gap-1">
            <TabsTrigger value="surveys" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <ClipboardList size={16} className="shrink-0" />
              <span className="text-center leading-tight">Pesquisas</span>
            </TabsTrigger>
            <TabsTrigger value="orgchart" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <Network size={16} className="shrink-0" />
              <span className="text-center leading-tight">Organograma</span>
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <Image size={16} className="shrink-0" />
              <span className="text-center leading-tight">Banners</span>
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <Megaphone size={16} className="shrink-0" />
              <span className="text-center leading-tight">Mensagens</span>
            </TabsTrigger>
          </TabsList>
          <TabsList className="w-full h-auto p-1 grid grid-cols-4 mb-2 gap-1">
            <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <BarChart3 size={16} className="shrink-0" />
              <span className="text-center leading-tight">Acessos</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center gap-1 text-[11px] sm:text-xs py-3 h-auto whitespace-normal">
              <Settings size={16} className="shrink-0" />
              <span className="text-center leading-tight">Configurações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="missionaries"><ManageMissionaries /></TabsContent>
          <TabsContent value="families"><ManageFamilies /></TabsContent>
          <TabsContent value="events"><ManageEvents /></TabsContent>
          <TabsContent value="materials"><ManageMaterials /></TabsContent>
          <TabsContent value="locations"><ManageLocations /></TabsContent>
          <TabsContent value="location-notes"><ManageLocationNotes /></TabsContent>
          <TabsContent value="store"><ManageStore /></TabsContent>
          <TabsContent value="orders"><ManageOrders /></TabsContent>
          <TabsContent value="surveys"><ManageSurveys /></TabsContent>

          <TabsContent value="orgchart"><ManageOrgChart /></TabsContent>
          <TabsContent value="banners"><ManageBanners /></TabsContent>
          <TabsContent value="broadcast"><AdminBroadcast /></TabsContent>
          <TabsContent value="settings"><ManageAppSettings /></TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Admin;

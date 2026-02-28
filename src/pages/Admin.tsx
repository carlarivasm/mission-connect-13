import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, BookOpen, MapPin, ShoppingBag, ClipboardList, Heart, GraduationCap } from "lucide-react";
import ManageMissionaries from "@/components/admin/ManageMissionaries";
import ManageEvents from "@/components/admin/ManageEvents";
import ManageMaterials from "@/components/admin/ManageMaterials";
import ManageLocations from "@/components/admin/ManageLocations";
import ManageStore from "@/components/admin/ManageStore";
import ManageSurveys from "@/components/admin/ManageSurveys";
import ManageFamilies from "@/components/admin/ManageFamilies";
import ManageFormations from "@/components/admin/ManageFormations";

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
          <TabsList className="w-full grid grid-cols-4 mb-2">
            <TabsTrigger value="missionaries" className="flex flex-col items-center gap-0.5 text-xs py-2">
              <Users size={16} />
              <span>Missionários</span>
            </TabsTrigger>
            <TabsTrigger value="families" className="flex flex-col items-center gap-0.5 text-xs py-2">
              <Heart size={16} />
              <span>Famílias</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex flex-col items-center gap-0.5 text-xs py-2">
              <Calendar size={16} />
              <span>Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex flex-col items-center gap-0.5 text-xs py-2">
              <BookOpen size={16} />
              <span>Materiais</span>
            </TabsTrigger>
          </TabsList>
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="locations" className="flex flex-col items-center gap-0.5 text-xs py-2">
              <MapPin size={16} />
              <span>Locais</span>
            </TabsTrigger>
            <TabsTrigger value="store" className="flex flex-col items-center gap-0.5 text-xs py-2">
              <ShoppingBag size={16} />
              <span>Loja</span>
            </TabsTrigger>
            <TabsTrigger value="surveys" className="flex flex-col items-center gap-0.5 text-xs py-2">
              <ClipboardList size={16} />
              <span>Pesquisas</span>
            </TabsTrigger>
            <TabsTrigger value="formations" className="flex flex-col items-center gap-0.5 text-xs py-2">
              <GraduationCap size={16} />
              <span>Formação</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="missionaries"><ManageMissionaries /></TabsContent>
          <TabsContent value="families"><ManageFamilies /></TabsContent>
          <TabsContent value="events"><ManageEvents /></TabsContent>
          <TabsContent value="materials"><ManageMaterials /></TabsContent>
          <TabsContent value="locations"><ManageLocations /></TabsContent>
          <TabsContent value="store"><ManageStore /></TabsContent>
          <TabsContent value="surveys"><ManageSurveys /></TabsContent>
          <TabsContent value="formations"><ManageFormations /></TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Admin;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaterialCard, { type Material } from "@/components/materials/MaterialCard";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const MISSIONARY_CATEGORIES: Record<string, string> = {
  formacao_missionarios: "Formação dos Missionários",
  geral: "Geral",
  oração: "Oração",
  formação: "Formação",
  liturgia: "Liturgia",
  evangelização: "Evangelização",
  atividades: "Atividades",
};

const RESPONSAVEIS_CATEGORIES: Record<string, string> = {
  formacao_responsaveis: "Formação dos Responsáveis",
  outros_responsaveis: "Outros Materiais",
};

const allCategoryLabels = { ...MISSIONARY_CATEGORIES, ...RESPONSAVEIS_CATEGORIES };

const Materiais = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("materials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setMaterials(data as Material[]);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const respCategories = Object.keys(RESPONSAVEIS_CATEGORIES);
  const missionaryMaterials = materials.filter((m) => !respCategories.includes(m.category));
  const responsaveisMaterials = materials.filter((m) => respCategories.includes(m.category));

  const uniqueMissionaryCategories = [...new Set(missionaryMaterials.map((m) => m.category))];
  const uniqueRespCategories = [...new Set(responsaveisMaterials.map((m) => m.category))];

  const renderCategoryAccordion = (items: Material[], categories: string[]) => (
    <div className="space-y-2">
      {categories.map((cat) => {
        const catItems = items.filter((m) => m.category === cat);
        if (catItems.length === 0) return null;
        return (
          <Collapsible key={cat}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm border border-border transition-colors hover:bg-accent/50 [&[data-state=open]>svg]:rotate-180">
              {allCategoryLabels[cat] || cat}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 pb-1 animate-fade-in">
                {catItems.map((mat) => (
                  <MaterialCard
                    key={mat.id}
                    material={mat}
                    categoryLabel={allCategoryLabels[mat.category] || mat.category}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );

  const renderLoading = () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Materiais" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        <div className="animate-fade-in">
          <h2 className="text-xl font-display font-bold text-foreground">Materiais</h2>
          <p className="text-sm text-muted-foreground mt-1">Recursos e formação missionária.</p>
        </div>

        <Tabs defaultValue="missionarios" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="missionarios" className="text-xs px-1">Missionários</TabsTrigger>
            <TabsTrigger value="responsaveis" className="text-xs px-1">Responsáveis</TabsTrigger>
          </TabsList>

          <TabsContent value="missionarios" className="space-y-4">
            {loading ? renderLoading() : uniqueMissionaryCategories.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum material disponível.</p>
            ) : renderCategoryAccordion(missionaryMaterials, uniqueMissionaryCategories)}
          </TabsContent>

          <TabsContent value="responsaveis" className="space-y-4">
            {loading ? renderLoading() : uniqueRespCategories.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum material disponível para responsáveis.</p>
            ) : renderCategoryAccordion(responsaveisMaterials, uniqueRespCategories)}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default Materiais;

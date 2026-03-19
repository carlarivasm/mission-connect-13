import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaterialCard, { type Material } from "@/components/materials/MaterialCard";

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
  const [selectedCatMissionary, setSelectedCatMissionary] = useState<string | null>(null);
  const [selectedCatResp, setSelectedCatResp] = useState<string | null>(null);

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

  const filteredMissionary = selectedCatMissionary
    ? missionaryMaterials.filter((m) => m.category === selectedCatMissionary)
    : missionaryMaterials;
  const filteredResp = selectedCatResp
    ? responsaveisMaterials.filter((m) => m.category === selectedCatResp)
    : responsaveisMaterials;

  const uniqueMissionaryCategories = [...new Set(missionaryMaterials.map((m) => m.category))];
  const uniqueRespCategories = [...new Set(responsaveisMaterials.map((m) => m.category))];

  const renderCategoryFilter = (
    categories: string[],
    selected: string | null,
    onSelect: (cat: string | null) => void,
  ) =>
    categories.length > 0 && (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => onSelect(null)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!selected ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Todos
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => onSelect(cat)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selected === cat ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {allCategoryLabels[cat] || cat}
          </button>
        ))}
      </div>
    );

  const renderMaterialsGrid = (items: Material[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
      {items.map((mat) => (
        <MaterialCard
          key={mat.id}
          material={mat}
          categoryLabel={allCategoryLabels[mat.category] || mat.category}
        />
      ))}
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
            {renderCategoryFilter(uniqueMissionaryCategories, selectedCatMissionary, setSelectedCatMissionary)}
            {loading ? renderLoading() : filteredMissionary.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum material disponível.</p>
            ) : renderMaterialsGrid(filteredMissionary)}
          </TabsContent>

          <TabsContent value="responsaveis" className="space-y-4">
            {renderCategoryFilter(uniqueRespCategories, selectedCatResp, setSelectedCatResp)}
            {loading ? renderLoading() : filteredResp.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum material disponível para responsáveis.</p>
            ) : renderMaterialsGrid(filteredResp)}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default Materiais;

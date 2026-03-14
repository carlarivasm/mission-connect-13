import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ExternalLink, Play, Music, File, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  link_url: string | null;
  material_type: string;
  storage_path: string | null;
  created_at: string;
}

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

const materialTypeIcon = (type: string) => {
  switch (type) {
    case "pdf": return <FileText size={20} />;
    case "video": return <Play size={20} />;
    case "audio": return <Music size={20} />;
    case "link": return <Link2 size={20} />;
    default: return <File size={20} />;
  }
};

const materialTypeLabel = (type: string) => {
  switch (type) {
    case "pdf": return "PDF";
    case "video": return "Vídeo";
    case "audio": return "Áudio";
    case "link": return "Link";
    default: return "Documento";
  }
};

const Materiais = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatMissionary, setSelectedCatMissionary] = useState<string | null>(null);
  const [selectedCatResp, setSelectedCatResp] = useState<string | null>(null);
  const [playingMedia, setPlayingMedia] = useState<Material | null>(null);

  useEffect(() => {
    supabase.from("materials").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setMaterials(data as Material[]); setLoading(false); });
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

  const allCategoryLabels = { ...MISSIONARY_CATEGORIES, ...RESPONSAVEIS_CATEGORIES };

  const handleOpenMaterial = (mat: Material) => {
    if ((mat.material_type === "video" || mat.material_type === "audio") && (mat.file_url || mat.link_url)) {
      setPlayingMedia(mat);
    } else if (mat.file_url) {
      window.open(mat.file_url, "_blank");
    } else if (mat.link_url) {
      window.open(mat.link_url, "_blank");
    }
  };

  const renderMaterialsList = (items: Material[]) => (
    <div className="space-y-3 animate-fade-in">
      {items.map((mat) => (
        <button key={mat.id} onClick={() => handleOpenMaterial(mat)} className="w-full flex items-center gap-4 p-4 bg-card rounded-xl shadow-card text-left">
          <div className="p-3 rounded-lg gradient-mission text-primary-foreground shrink-0">
            {materialTypeIcon(mat.material_type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{mat.title}</p>
            {mat.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{mat.description}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {allCategoryLabels[mat.category] || mat.category}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {materialTypeLabel(mat.material_type)}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-primary">
            {mat.link_url && mat.material_type === "link" ? <ExternalLink size={18} /> : null}
          </div>
        </button>
      ))}
    </div>
  );

  const renderCategoryFilter = (
    categories: string[],
    selected: string | null,
    onSelect: (cat: string | null) => void,
    labels: Record<string, string>,
  ) => (
    categories.length > 0 && (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => onSelect(null)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!selected ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Todos
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => onSelect(cat)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selected === cat ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {labels[cat] || cat}
          </button>
        ))}
      </div>
    )
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
            {renderCategoryFilter(uniqueMissionaryCategories, selectedCatMissionary, setSelectedCatMissionary, MISSIONARY_CATEGORIES)}
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : filteredMissionary.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum material disponível.</p>
            ) : renderMaterialsList(filteredMissionary)}
          </TabsContent>

          <TabsContent value="responsaveis" className="space-y-4">
            {renderCategoryFilter(uniqueRespCategories, selectedCatResp, setSelectedCatResp, RESPONSAVEIS_CATEGORIES)}
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : filteredResp.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum material disponível para responsáveis.</p>
            ) : renderMaterialsList(filteredResp)}
          </TabsContent>
        </Tabs>

        {/* Media Player Dialog */}
        <Dialog open={!!playingMedia} onOpenChange={(open) => { if (!open) setPlayingMedia(null); }}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            {playingMedia && (
              <>
                {playingMedia.material_type === "video" ? (
                  <video src={playingMedia.file_url || playingMedia.link_url || ""} controls autoPlay className="w-full max-h-[60vh] bg-black" />
                ) : (
                  <audio src={playingMedia.file_url || playingMedia.link_url || ""} controls autoPlay className="w-full p-4" />
                )}
                <div className="p-4">
                  <p className="text-foreground font-semibold">{playingMedia.title}</p>
                  <p className="text-xs text-muted-foreground">{allCategoryLabels[playingMedia.category] || playingMedia.category}</p>
                  {playingMedia.description && <p className="text-sm text-muted-foreground mt-1">{playingMedia.description}</p>}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <BottomNav />
    </div>
  );
};

export default Materiais;

import { Plus, Image as ImageIcon } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

const mockPhotos = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  alt: `Missão foto ${i + 1}`,
}));

const Galeria = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Galeria de Fotos" />
      <main className="px-4 py-5 space-y-5">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Galeria</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Fotos das nossas missões</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-mission text-primary-foreground text-sm font-semibold shadow-card">
            <Plus size={16} />
            Upload
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {mockPhotos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square rounded-xl bg-muted flex items-center justify-center overflow-hidden shadow-card"
            >
              <ImageIcon size={24} className="text-muted-foreground/40" />
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Em breve: upload de fotos das missões!
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default Galeria;

import { useState } from "react";
import { FileText, Play, Music, File, Link2, ExternalLink, ImageIcon } from "lucide-react";
import YouTubeEmbed from "./YouTubeEmbed";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  link_url: string | null;
  material_type: string;
  storage_path: string | null;
  sort_order: number;
  created_at: string;
}

interface MaterialCardProps {
  material: Material;
  categoryLabel: string;
}

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

const materialTypeIcon = (type: string) => {
  switch (type) {
    case "pdf": return <FileText size={18} />;
    case "video": return <Play size={18} />;
    case "audio": return <Music size={18} />;
    case "link": return <Link2 size={18} />;
    default: return <File size={18} />;
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

const Badge = ({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "youtube" | "type" }) => {
  const styles = {
    default: "bg-muted text-muted-foreground",
    youtube: "bg-red-500/10 text-red-600",
    type: "bg-primary/10 text-primary",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${styles[variant]}`}>
      {children}
    </span>
  );
};

const MaterialCard = ({ material, categoryLabel }: MaterialCardProps) => {
  const url = material.link_url || material.file_url || "";
  const youtubeId = url ? extractYouTubeId(url) : null;

  const handleOpen = () => {
    const target = material.file_url || material.link_url;
    if (target) window.open(target, "_blank", "noopener");
  };

  // YouTube card
  if (youtubeId) {
    return (
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <YouTubeEmbed videoId={youtubeId} title={material.title} />
        <div className="p-3 space-y-1.5">
          <p className="font-semibold text-sm text-foreground line-clamp-2">{material.title}</p>
          {material.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{material.description}</p>
          )}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Badge>{categoryLabel}</Badge>
            <Badge variant="youtube"><Play size={8} fill="currentColor" /> YouTube</Badge>
          </div>
        </div>
      </div>
    );
  }

  // Audio card
  if (material.material_type === "audio" && (material.file_url || material.link_url)) {
    return (
      <div className="bg-card rounded-xl shadow-card overflow-hidden p-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg gradient-mission text-primary-foreground shrink-0">
            <Music size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground line-clamp-2">{material.title}</p>
            {material.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{material.description}</p>
            )}
          </div>
        </div>
        <audio
          src={material.file_url || material.link_url || ""}
          controls
          preload="none"
          className="w-full h-10"
        />
        <div className="flex items-center gap-1.5">
          <Badge>{categoryLabel}</Badge>
          <Badge variant="type">Áudio</Badge>
        </div>
      </div>
    );
  }

  // Non-YouTube video
  if (material.material_type === "video" && material.file_url) {
    return (
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <button onClick={handleOpen} className="relative w-full aspect-video bg-muted group">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 group-active:scale-95 transition-transform duration-150">
              <Play size={28} className="text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        </button>
        <div className="p-3 space-y-1.5">
          <p className="font-semibold text-sm text-foreground line-clamp-2">{material.title}</p>
          {material.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{material.description}</p>
          )}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Badge>{categoryLabel}</Badge>
            <Badge variant="type">Vídeo</Badge>
          </div>
        </div>
      </div>
    );
  }

  // Default (PDF, doc, link)
  return (
    <button
      onClick={handleOpen}
      className="w-full bg-card rounded-xl shadow-card overflow-hidden p-4 text-left hover:shadow-elevated active:scale-[0.98] transition-all duration-150"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg gradient-mission text-primary-foreground shrink-0">
          {materialTypeIcon(material.material_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground line-clamp-2">{material.title}</p>
          {material.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{material.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <Badge>{categoryLabel}</Badge>
            <Badge variant="type">{materialTypeLabel(material.material_type)}</Badge>
          </div>
        </div>
        <ExternalLink size={16} className="shrink-0 text-primary mt-1" />
      </div>
    </button>
  );
};

export type { Material };
export default MaterialCard;

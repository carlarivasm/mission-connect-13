import { FileText, Play, Music, File, Link2, ExternalLink } from "lucide-react";
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
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
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

const MaterialCard = ({ material, categoryLabel }: MaterialCardProps) => {
  const url = material.link_url || material.file_url || "";
  const youtubeId = url ? extractYouTubeId(url) : null;
  const isYouTube = !!youtubeId;

  const handleOpen = () => {
    if (material.file_url) {
      window.open(material.file_url, "_blank");
    } else if (material.link_url) {
      window.open(material.link_url, "_blank");
    }
  };

  // YouTube video card with embedded player
  if (isYouTube && youtubeId) {
    return (
      <div className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in">
        <YouTubeEmbed videoId={youtubeId} title={material.title} />
        <div className="p-3">
          <p className="font-semibold text-sm text-foreground line-clamp-2">{material.title}</p>
          {material.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{material.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {categoryLabel}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-semibold flex items-center gap-1">
              <Play size={8} fill="currentColor" /> YouTube
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Audio card with inline player
  if (material.material_type === "audio" && (material.file_url || material.link_url)) {
    return (
      <div className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in p-4 space-y-2">
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
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {categoryLabel}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            Áudio
          </span>
        </div>
      </div>
    );
  }

  // Non-YouTube video with file
  if (material.material_type === "video" && material.file_url) {
    return (
      <div className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in">
        <button onClick={handleOpen} className="relative w-full aspect-video bg-muted group">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play size={28} className="text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        </button>
        <div className="p-3">
          <p className="font-semibold text-sm text-foreground line-clamp-2">{material.title}</p>
          {material.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{material.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {categoryLabel}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              Vídeo
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default card (PDF, document, link, etc.)
  return (
    <button
      onClick={handleOpen}
      className="w-full bg-card rounded-xl shadow-card overflow-hidden animate-fade-in p-4 text-left hover:shadow-md transition-shadow"
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
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {categoryLabel}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {materialTypeLabel(material.material_type)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-primary mt-1">
          <ExternalLink size={16} />
        </div>
      </div>
    </button>
  );
};

export type { Material };
export default MaterialCard;

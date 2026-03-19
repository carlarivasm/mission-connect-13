import { useState, useCallback } from "react";
import { Play, ExternalLink } from "lucide-react";

interface YouTubeEmbedProps {
  videoId: string;
  title: string;
}

const YouTubeEmbed = ({ videoId, title }: YouTubeEmbedProps) => {
  const [loaded, setLoaded] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const handlePlay = useCallback(() => setLoaded(true), []);

  const handleOpenExternal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank", "noopener");
  }, [videoId]);

  if (!loaded) {
    return (
      <div className="relative w-full aspect-video bg-muted rounded-t-xl overflow-hidden">
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform duration-150"
            aria-label={`Reproduzir ${title}`}
          >
            <Play size={30} className="text-white ml-1" fill="white" />
          </button>
        </div>
        <button
          onClick={handleOpenExternal}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Abrir no YouTube"
          title="Abrir no YouTube"
        >
          <ExternalLink size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-t-xl overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
};

export default YouTubeEmbed;

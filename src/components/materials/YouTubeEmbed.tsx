import { useState } from "react";
import { Play } from "lucide-react";

interface YouTubeEmbedProps {
  videoId: string;
  title: string;
}

const YouTubeEmbed = ({ videoId, title }: YouTubeEmbedProps) => {
  const [loaded, setLoaded] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (!loaded) {
    return (
      <button
        onClick={() => setLoaded(true)}
        className="relative w-full aspect-video bg-black rounded-t-xl overflow-hidden group"
        aria-label={`Reproduzir ${title}`}
      >
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
          <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-t-xl overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
        loading="lazy"
      />
    </div>
  );
};

export default YouTubeEmbed;

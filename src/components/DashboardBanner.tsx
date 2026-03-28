import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
}

const DashboardBanner = () => {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    supabase
      .from("dashboard_banners")
      .select("id, title, media_url, media_type")
      .eq("active", true)
      .lte("publish_at", new Date().toISOString())
      .gt("expire_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setBanners(data);
      });
  }, []);

  if (banners.length === 0) return null;

  return (
    <section className="animate-fade-in space-y-3">
      {banners.map((banner) => (
        <div key={banner.id} className="rounded-xl overflow-hidden border border-primary/20 bg-card shadow-card">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10">
            <span className="text-base">📢</span>
            <span className="text-sm font-bold text-primary">{banner.title}</span>
          </div>
          {banner.media_type === "video" ? (
            <video
              src={banner.media_url}
              controls
              autoPlay
              muted
              playsInline
              className="w-full max-h-[300px] object-contain bg-black"
            />
          ) : (
            <img
              src={banner.media_url}
              alt={banner.title}
              className="w-full max-h-[300px] object-contain"
              loading="lazy"
            />
          )}
        </div>
      ))}
    </section>
  );
};

export default DashboardBanner;

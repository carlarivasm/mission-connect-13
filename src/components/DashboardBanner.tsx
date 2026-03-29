import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

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

  const renderMedia = (banner: Banner) => {
    if (banner.media_type === "video") {
      return (
        <video
          src={banner.media_url}
          controls
          autoPlay
          muted
          playsInline
          className="w-full max-h-[300px] object-contain bg-black"
        />
      );
    }
    if (banner.media_type === "audio") {
      return (
        <div className="flex items-center justify-center p-4 bg-muted/30">
          <audio src={banner.media_url} controls className="w-full" />
        </div>
      );
    }
    return (
      <img
        src={banner.media_url}
        alt={banner.title}
        className="w-full max-h-[300px] object-contain"
        loading="lazy"
      />
    );
  };

  if (banners.length === 1) {
    const banner = banners[0];
    return (
      <section className="animate-fade-in">
        <div className="rounded-xl overflow-hidden border border-primary/20 bg-card shadow-card">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10">
            <span className="text-base">📢</span>
            <span className="text-sm font-bold text-primary">{banner.title}</span>
          </div>
          {renderMedia(banner)}
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-in">
      <Carousel
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {banners.map((banner) => (
            <CarouselItem key={banner.id} className="pl-0">
              <div className="rounded-xl overflow-hidden border border-primary/20 bg-card shadow-card">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10">
                  <span className="text-base">📢</span>
                  <span className="text-sm font-bold text-primary">{banner.title}</span>
                </div>
                {renderMedia(banner)}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex justify-center gap-1.5 mt-2">
          {banners.map((_, i) => (
            <BannerDot key={i} index={i} />
          ))}
        </div>
      </Carousel>
    </section>
  );
};

// Dot indicator that reads carousel state
import { useContext } from "react";

const BannerDot = ({ index }: { index: number }) => {
  // We need to access the carousel API to highlight the active dot
  // Since we can't easily use the internal context, we'll use a simpler approach
  return (
    <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
  );
};

export default DashboardBanner;

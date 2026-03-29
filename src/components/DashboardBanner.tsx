import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
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
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

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

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api, onSelect]);

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
        <div className="flex items-center justify-center p-6 bg-muted/30">
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

  const renderBannerCard = (banner: Banner) => (
    <div className="rounded-xl overflow-hidden border border-primary/20 bg-card shadow-card">
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10">
        <span className="text-base">📢</span>
        <span className="text-sm font-bold text-primary">{banner.title}</span>
      </div>
      {renderMedia(banner)}
    </div>
  );

  if (banners.length === 1) {
    return (
      <section className="animate-fade-in">
        {renderBannerCard(banners[0])}
      </section>
    );
  }

  return (
    <section className="animate-fade-in">
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {banners.map((banner) => (
            <CarouselItem key={banner.id} className="pl-0">
              {renderBannerCard(banner)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="flex justify-center gap-1.5 mt-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? "bg-primary" : "bg-primary/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default DashboardBanner;

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Slider } from "@/components/ui/slider";
import { Play, Pause } from "lucide-react";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const AudioPlayer = ({ src }: { src: string }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onMeta = () => setDur(a.duration);
    const onTime = () => setCur(a.currentTime);
    const onEnd = () => setPlaying(false);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    if (!ref.current) return;
    playing ? ref.current.pause() : ref.current.play();
    setPlaying(!playing);
  };

  const seek = (v: number[]) => {
    if (ref.current) ref.current.currentTime = v[0];
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (ref.current) ref.current.playbackRate = SPEEDS[next];
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <audio ref={ref} src={src} preload="metadata" />
      <button onClick={toggle} className="shrink-0 text-primary">
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <Slider
        value={[cur]}
        max={dur || 1}
        step={0.1}
        onValueChange={seek}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {fmt(dur)}
      </span>
      <button
        onClick={cycleSpeed}
        className="text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0"
      >
        {SPEEDS[speedIdx]}x
      </button>
    </div>
  );
};

interface Banner {
  id: string;
  title: string;
  body_text: string | null;
  media_url: string;
  media_type: string;
}

const DashboardBanner = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [carouselInterval, setCarouselInterval] = useState(5000);

  useEffect(() => {
    // Fetch banners and interval setting in parallel
    Promise.all([
      supabase
        .from("dashboard_banners")
        .select("id, title, media_url, media_type")
        .eq("active", true)
        .lte("publish_at", new Date().toISOString())
        .gt("expire_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "banner_carousel_interval")
        .maybeSingle(),
    ]).then(([bannersRes, settingRes]) => {
      if (bannersRes.data) setBanners(bannersRes.data);
      if (settingRes.data) {
        const seconds = parseInt(settingRes.data.setting_value, 10);
        if (seconds >= 2 && seconds <= 30) setCarouselInterval(seconds * 1000);
      }
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
      return <AudioPlayer src={banner.media_url} />;
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
        plugins={[Autoplay({ delay: carouselInterval, stopOnInteraction: true })]}
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

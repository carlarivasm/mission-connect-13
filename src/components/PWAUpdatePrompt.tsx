import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-primary text-primary-foreground rounded-xl shadow-lg p-4 flex items-center gap-3 max-w-md mx-auto">
        <RefreshCw size={20} className="shrink-0 animate-spin-slow" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Nova versão disponível!</p>
          <p className="text-xs opacity-90">Atualize para ter a melhor experiência.</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 text-xs font-bold"
          onClick={() => updateServiceWorker(true)}
        >
          Atualizar
        </Button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="shrink-0 opacity-70 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;

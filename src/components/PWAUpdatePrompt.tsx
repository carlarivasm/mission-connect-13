import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Loader2 } from "lucide-react";

const PWAUpdatePrompt = () => {
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await updateServiceWorker(true);
      // Force reload after a short delay if SW doesn't trigger it
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch {
      setUpdating(false);
      setNeedRefresh(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-primary text-primary-foreground rounded-xl shadow-lg p-4 flex items-center gap-3 max-w-md mx-auto">
        {updating ? (
          <Loader2 size={20} className="shrink-0 animate-spin" />
        ) : (
          <RefreshCw size={20} className="shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Nova versão disponível!</p>
          <p className="text-xs opacity-90">
            {updating ? "Atualizando..." : "Atualize para ter a melhor experiência."}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 text-xs font-bold"
          onClick={handleUpdate}
          disabled={updating}
        >
          Atualizar
        </Button>
        {!updating && (
          <button
            onClick={() => setNeedRefresh(false)}
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;

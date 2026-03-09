import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isSupported, getMessaging, getToken } from "firebase/messaging";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiagnosticItem {
  label: string;
  status: "ok" | "warning" | "error" | "loading";
  detail: string;
}

const PushDiagnostics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<DiagnosticItem[]>([]);
  const [running, setRunning] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setRunning(true);
    setFcmToken(null);
    const results: DiagnosticItem[] = [];

    // 1. Check browser support
    const hasSW = "serviceWorker" in navigator;
    results.push({
      label: "Service Worker",
      status: hasSW ? "ok" : "error",
      detail: hasSW ? "Suportado pelo navegador" : "Não suportado — push não funcionará",
    });

    // 2. Check Notification API
    const hasNotifAPI = "Notification" in window;
    results.push({
      label: "Notification API",
      status: hasNotifAPI ? "ok" : "error",
      detail: hasNotifAPI ? "Disponível" : "Não disponível (iOS requer PWA na tela inicial)",
    });

    // 3. Check permission
    if (hasNotifAPI) {
      const perm = Notification.permission;
      results.push({
        label: "Permissão",
        status: perm === "granted" ? "ok" : perm === "denied" ? "error" : "warning",
        detail:
          perm === "granted"
            ? "Concedida ✓"
            : perm === "denied"
            ? "Bloqueada — vá em Configurações do navegador para desbloquear"
            : "Ainda não solicitada — recarregue a página",
      });
    }

    // 4. Check Firebase messaging support
    let supported = false;
    try {
      supported = await isSupported();
    } catch {
      supported = false;
    }
    results.push({
      label: "Firebase Messaging",
      status: supported ? "ok" : "error",
      detail: supported ? "Suportado" : "Não suportado neste navegador/contexto",
    });

    // 5. Check SW registration
    if (hasSW) {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
        results.push({
          label: "Firebase SW",
          status: reg ? "ok" : "warning",
          detail: reg ? `Registrado (scope: ${reg.scope})` : "Não registrado — recarregue a página após login",
        });
      } catch (err: any) {
        results.push({
          label: "Firebase SW",
          status: "error",
          detail: `Erro: ${err.message}`,
        });
      }
    }

    // 6. Try to get FCM token
    if (supported && hasNotifAPI && Notification.permission === "granted") {
      try {
        const { initializeApp, getApps } = await import("firebase/app");
        const firebaseConfig = {
          apiKey: "AIzaSyASM3oAyOQ8lYN0iVAIWP0gwwA1_UTY0KE",
          authDomain: "missoes-semana-santa-app.firebaseapp.com",
          projectId: "missoes-semana-santa-app",
          storageBucket: "missoes-semana-santa-app.firebasestorage.app",
          messagingSenderId: "154086408355",
          appId: "1:154086408355:web:1ff9b562664cbb84cdbf16",
        };
        const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);
        const swReg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
        const token = await getToken(messaging, {
          vapidKey: "BBJE6qW1flHcz-2xebO8x5R3cCE_ZanbIjAR-3KxYi-kJew3f0nhszWPJf59phF7lb4fJ_tYyY7u4MknQuNx9qU",
          serviceWorkerRegistration: swReg,
        });

        if (token) {
          setFcmToken(token);
          results.push({
            label: "Token FCM",
            status: "ok",
            detail: `Obtido: ${token.substring(0, 30)}...`,
          });
        } else {
          results.push({
            label: "Token FCM",
            status: "error",
            detail: "Nenhum token retornado",
          });
        }
      } catch (err: any) {
        results.push({
          label: "Token FCM",
          status: "error",
          detail: `Erro: ${err.message}`,
        });
      }
    } else {
      results.push({
        label: "Token FCM",
        status: "warning",
        detail: "Não é possível obter — pré-requisitos não atendidos acima",
      });
    }

    // 7. Check saved tokens in DB
    if (user) {
      const { data, error } = await supabase
        .from("fcm_tokens")
        .select("token, updated_at")
        .eq("user_id", user.id);

      if (error) {
        results.push({
          label: "Tokens salvos no banco",
          status: "error",
          detail: `Erro: ${error.message}`,
        });
      } else {
        results.push({
          label: "Tokens salvos no banco",
          status: data && data.length > 0 ? "ok" : "warning",
          detail:
            data && data.length > 0
              ? `${data.length} token(s) — último: ${new Date(data[0].updated_at).toLocaleString("pt-BR")}`
              : "Nenhum token salvo — o token será salvo ao conceder permissão",
        });
      }
    }

    setItems(results);
    setRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const statusIcon = (status: DiagnosticItem["status"]) => {
    switch (status) {
      case "ok": return <CheckCircle size={16} className="text-green-500 shrink-0" />;
      case "warning": return <AlertTriangle size={16} className="text-yellow-500 shrink-0" />;
      case "error": return <XCircle size={16} className="text-destructive shrink-0" />;
      default: return <Activity size={16} className="text-muted-foreground animate-pulse shrink-0" />;
    }
  };

  const copyToken = () => {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      toast({ title: "Token copiado!" });
    }
  };

  return (
    <section className="bg-card rounded-xl p-4 shadow-card space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
          <Activity size={16} /> Diagnóstico Push Notifications
        </h3>
        <Button variant="ghost" size="sm" onClick={runDiagnostics} disabled={running}>
          <RefreshCw size={14} className={running ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
            {statusIcon(item.status)}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground break-all">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {fcmToken && (
        <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={copyToken}>
          <Copy size={12} /> Copiar Token FCM
        </Button>
      )}

      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>• iOS: push só funciona com o app instalado na tela inicial (PWA)</p>
        <p>• Se a permissão está "bloqueada", altere nas configurações do navegador</p>
        <p>• Após conceder permissão, recarregue a página</p>
      </div>
    </section>
  );
};

export default PushDiagnostics;

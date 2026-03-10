import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isSupported, getMessaging, getToken } from "firebase/messaging";
import { getApps, initializeApp } from "firebase/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiagnosticItem {
  label: string;
  status: "ok" | "warning" | "error" | "loading";
  detail: string;
}

const FIREBASE_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

const PushDiagnostics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<DiagnosticItem[]>([]);
  const [running, setRunning] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const detectBrowser = () => {
    const ua = navigator.userAgent;
    if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
    if (/CriOS/i.test(ua)) return "Chrome iOS";
    if (/FxiOS/i.test(ua)) return "Firefox iOS";
    if (/EdgiOS/i.test(ua)) return "Edge iOS";
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
    if (/Chrome/i.test(ua)) return "Chrome";
    if (/Firefox/i.test(ua)) return "Firefox";
    return "Desconhecido";
  };

  const isIOSSafari = () => {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  };

  const isStandalone = () => {
    return window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
  };

  const runDiagnostics = async () => {
    setRunning(true);
    setFcmToken(null);
    const results: DiagnosticItem[] = [];

    // 0. Browser info
    const browser = detectBrowser();
    const ios = isIOSSafari();
    const standalone = isStandalone();
    results.push({
      label: "Navegador",
      status: "ok",
      detail: `${browser}${ios ? " (iOS)" : ""}${standalone ? " — PWA instalado ✓" : ""}`,
    });

    // iOS standalone check
    if (ios && !standalone) {
      results.push({
        label: "PWA (iOS)",
        status: "error",
        detail: "No iOS, push só funciona com o app instalado na tela inicial. Toque em Compartilhar → Adicionar à Tela de Início.",
      });
    }

    // 1. Service Worker
    const hasSW = "serviceWorker" in navigator;
    results.push({
      label: "Service Worker",
      status: hasSW ? "ok" : "error",
      detail: hasSW ? "Suportado" : "Não suportado — push não funcionará neste navegador",
    });

    // 2. Notification API
    const hasNotifAPI = "Notification" in window;
    results.push({
      label: "Notification API",
      status: hasNotifAPI ? "ok" : "error",
      detail: hasNotifAPI ? "Disponível" : "Não disponível" + (ios ? " — instale como PWA primeiro" : ""),
    });

    // 3. PushManager
    const hasPush = "PushManager" in window;
    results.push({
      label: "PushManager",
      status: hasPush ? "ok" : "error",
      detail: hasPush ? "Disponível" : "Não disponível neste navegador",
    });

    // 4. Permission
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

    // 5. Firebase messaging support
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

    // 6. SW registration
    if (hasSW) {
      try {
        const allRegs = await navigator.serviceWorker.getRegistrations();
        const firebaseReg = await navigator.serviceWorker.getRegistration(FIREBASE_SW_SCOPE);
        
        results.push({
          label: "Firebase SW",
          status: firebaseReg ? "ok" : "warning",
          detail: firebaseReg
            ? `Ativo (scope: ${firebaseReg.scope})`
            : `Não encontrado (${allRegs.length} SW(s) registrado(s)). Recarregue após login.`,
        });
      } catch (err: any) {
        results.push({
          label: "Firebase SW",
          status: "error",
          detail: `Erro: ${err.message}`,
        });
      }
    }

    // 7. FCM token
    if (supported && hasNotifAPI && Notification.permission === "granted" && hasPush) {
      try {
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
        const swReg = await navigator.serviceWorker.getRegistration(FIREBASE_SW_SCOPE);
        
        const tokenOptions: any = {
          vapidKey: "BBJE6qW1flHcz-2xebO8x5R3cCE_ZanbIjAR-3KxYi-kJew3f0nhszWPJf59phF7lb4fJ_tYyY7u4MknQuNx9qU",
        };
        if (swReg) {
          tokenOptions.serviceWorkerRegistration = swReg;
        }

        const token = await getToken(messaging, tokenOptions);

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
        detail: "Pré-requisitos não atendidos (verifique itens acima)",
      });
    }

    // 8. Tokens in DB
    if (user) {
      const { data, error } = await supabase
        .from("fcm_tokens")
        .select("token, updated_at")
        .eq("user_id", user.id);

      if (error) {
        results.push({
          label: "Tokens no banco",
          status: "error",
          detail: `Erro: ${error.message}`,
        });
      } else {
        results.push({
          label: "Tokens no banco",
          status: data && data.length > 0 ? "ok" : "warning",
          detail:
            data && data.length > 0
              ? `${data.length} token(s) — último: ${new Date(data[0].updated_at).toLocaleString("pt-BR")}`
              : "Nenhum token salvo",
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
        <p>• <strong>iOS Safari</strong>: push só funciona com o app instalado na tela inicial (PWA)</p>
        <p>• <strong>Chrome Android</strong>: deve funcionar automaticamente após conceder permissão</p>
        <p>• <strong>Samsung Internet</strong>: verifique se notificações estão habilitadas nas configurações do navegador</p>
        <p>• Se a permissão está "bloqueada", altere nas configurações do navegador/sistema</p>
      </div>
    </section>
  );
};

export default PushDiagnostics;

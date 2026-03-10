import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Detecta iOS
        const ua = window.navigator.userAgent;
        const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        setIsIOS(ios);

        // Verifica se já está instalado
        if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            // Impede o prompt padrão
            e.preventDefault();
            // Armazena o evento para ser usado mais tarde
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            console.log("PWA foi instalado");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const installPWA = async () => {
        if (isIOS && !isInstalled) {
            toast({
                title: "Instale no iOS",
                description: "Toque no botão 'Compartilhar' na barra inferior do Safari e depois em 'Adicionar a Tela de Início'.",
                duration: 8000,
            });
            return;
        }

        if (!deferredPrompt) {
            toast({
                title: "Instalação não disponível",
                description: "Seu dispositivo ou navegador atual não suporta a instalação automática do aplicativo, ou ele já está instalado.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Mostra o prompt
            await deferredPrompt.prompt();

            // Aguarda a resposta do usuário
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === "accepted") {
                console.log("Usuário aceitou a instalação do PWA");
            } else {
                console.log("Usuário recusou a instalação do PWA");
            }

            // Limpa o prompt, pois ele só pode ser usado uma vez
            setDeferredPrompt(null);
        } catch (error: any) {
            console.error("Erro ao tentar instalar PWA:", error);
            toast({
                title: "Erro na instalação",
                description: error.message || "Ocorreu um erro ao tentar instalar o aplicativo.",
                variant: "destructive",
            });
        }
    };

    return {
        installPWA,
        isInstalled,
        isInstallable: !!deferredPrompt || isIOS,
    };
}

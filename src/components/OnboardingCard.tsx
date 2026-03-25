import { useState, useEffect } from "react";
import { CheckCircle2, Circle, X, Smartphone, Bell, Users, ShoppingBag, User, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useNavigate } from "react-router-dom";

const ONBOARDING_VERSION = 5;

export default function OnboardingCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { installPWA, isInstalled, isInstallable } = usePWAInstall();

  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const [statuses, setStatuses] = useState({
    appInstalled: false,
    pushAccepted: false,
    familyAdded: false,
    storeVisited: false,
    profileEdited: false,
  });

  const [justCompleted, setJustCompleted] = useState({
    appInstalled: false,
    pushAccepted: false,
    familyAdded: false,
    storeVisited: false,
    profileEdited: false,
  });

  useEffect(() => {
    if (!user) return;
    checkStatuses();
  }, [user, isInstalled]);

  // Recalculate based on focus just in case they return from another tab
  useEffect(() => {
    const handleFocus = () => {
      if (user) checkStatuses();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  const checkStatuses = async () => {
    const savedVersion = localStorage.getItem("onboarding_dismissed_version");
    if (savedVersion === String(ONBOARDING_VERSION)) {
      setDismissed(true);
      return;
    }

    try {
      // 1. App installed
      const currentAppInstalled = isInstalled;

      // 2. Push accepted
      const currentPushAccepted = "Notification" in window && Notification.permission === "granted";

      // 3. Family added
      let currentFamilyAdded = false;
      const { data: profile } = await supabase
        .from("profiles")
        .select("family_members_count, family_name")
        .eq("id", user!.id)
        .single();
      
      const { data: memberData } = await supabase
        .from("family_group_members")
        .select("family_group_id")
        .eq("user_id", user!.id)
        .limit(1);

      if ((profile?.family_members_count && profile.family_members_count > 0) || (memberData && memberData.length > 0)) {
        currentFamilyAdded = true;
      }

      // 4. Store visited
      const currentStoreVisited = localStorage.getItem("has_visited_store") === "true";

      // 5. Profile edited
      const currentProfileEdited = localStorage.getItem("has_visited_profile") === "true";

      const currentStatuses = {
        appInstalled: currentAppInstalled,
        pushAccepted: currentPushAccepted,
        familyAdded: currentFamilyAdded,
        storeVisited: currentStoreVisited,
        profileEdited: currentProfileEdited,
      };

      const savedStateStr = localStorage.getItem(`onboarding_state_${user!.id}`);
      const savedState = savedStateStr ? JSON.parse(savedStateStr) : {
        appInstalled: false,
        pushAccepted: false,
        familyAdded: false,
        storeVisited: false,
        profileEdited: false,
      };

      // Find what just completed
      const newJustCompleted = {
        appInstalled: currentAppInstalled && !savedState.appInstalled,
        pushAccepted: currentPushAccepted && !savedState.pushAccepted,
        familyAdded: currentFamilyAdded && !savedState.familyAdded,
        storeVisited: currentStoreVisited && !savedState.storeVisited,
        profileEdited: currentProfileEdited && !savedState.profileEdited,
      };

      setJustCompleted(newJustCompleted);
      setStatuses(currentStatuses);
      
      // Update saved state
      localStorage.setItem(`onboarding_state_${user!.id}`, JSON.stringify(currentStatuses));
    } catch (e) {
      console.error("Erro ao checar status de onboarding", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("onboarding_dismissed_version", String(ONBOARDING_VERSION));
    setDismissed(true);
  };

  const requestPush = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        checkStatuses();
      } else {
        alert("Permissão para notificações foi negada. Você pode alterá-la nas configurações do seu navegador.");
      }
    }
  };

  if (loading || dismissed) return null;

  const totalItems = Object.keys(statuses).length;
  const completedItems = Object.values(statuses).filter(Boolean).length;
  const allCompleted = completedItems === totalItems;

  const ListItem = ({ 
    icon: Icon, 
    title, 
    description, 
    isCompleted, 
    justDone, 
    action, 
    actionText 
  }: any) => {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className={`mt-0.5 shrink-0 origin-center ${justDone ? 'animate-check-pop text-green-500' : isCompleted ? 'text-green-500' : 'text-muted-foreground'}`}>
          {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isCompleted ? 'text-foreground line-through opacity-70' : 'text-foreground'}`}>{title}</p>
          <p className="text-xs text-muted-foreground mb-1.5 leading-snug">{description}</p>
          {!isCompleted && action && (
            <button 
              onClick={action}
              className="text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              {actionText}
            </button>
          )}
        </div>
        <div className="shrink-0 p-1 bg-muted/50 rounded-lg text-muted-foreground">
           <Icon size={16} />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-card p-4 border border-card-border relative animate-fade-in">
      <div 
        className={`flex items-start justify-between cursor-pointer group ${isExpanded ? 'mb-3' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <h3 className="text-base font-bold text-foreground font-display flex items-center gap-2">
            🚀 Primeiros Passos
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete estas ações para aproveitar ao máximo! ({completedItems}/{totalItems})
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-2">
          {allCompleted && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
              className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <button className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors text-primary-muted/50">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="space-y-1 mt-4">
        <ListItem 
          icon={Smartphone}
          title="Instalar o Aplicativo"
          description="Adicione o app à sua tela inicial para acesso rápido."
          isCompleted={statuses.appInstalled}
          justDone={justCompleted.appInstalled}
          action={installPWA}
          actionText="Instalar App"
        />
        <div className="h-px bg-border/50 ml-8" />

        <ListItem 
          icon={Bell}
          title="Ativar Notificações"
          description="Receba avisos importantes sobre missões e eventos."
          isCompleted={statuses.pushAccepted}
          justDone={justCompleted.pushAccepted}
          action={requestPush}
          actionText="Ativar Notificações"
        />
        <div className="h-px bg-border/50 ml-8" />

        <ListItem 
          icon={Users}
          title="Adicionar sua Família"
          description="Vincule ou adicione membros da sua família."
          isCompleted={statuses.familyAdded}
          justDone={justCompleted.familyAdded}
          action={() => navigate("/familia")}
          actionText="Ir para Família"
        />
        <div className="h-px bg-border/50 ml-8" />

        <ListItem 
          icon={ShoppingBag}
          title="Visitar a Loja"
          description="Conheça os materiais e kits missionários."
          isCompleted={statuses.storeVisited}
          justDone={justCompleted.storeVisited}
          action={() => navigate("/loja")}
          actionText="Abrir Loja"
        />
        <div className="h-px bg-border/50 ml-8" />

          <ListItem 
            icon={User}
            title="Editar seu Perfil"
            description="Acesse seu perfil para atualizar seus dados e foto."
            isCompleted={statuses.profileEdited}
            justDone={justCompleted.profileEdited}
            action={() => navigate("/perfil")}
            actionText="Ir para Perfil"
          />
        </div>

        {allCompleted && (
          <button 
            onClick={handleDismiss}
            className="w-full mt-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl"
          >
            Fechar Card
          </button>
        )}
      </div>
      )}
    </div>
  );
}

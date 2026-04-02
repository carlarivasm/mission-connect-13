import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationCard, MissionLocation, UserNote } from "@/components/map/LocationCard";
import { ReferencePointCard } from "@/components/map/ReferencePointCard";

const statusColors: Record<string, string> = {
  visitado: "bg-green-100 text-green-700",
  pendente: "bg-amber-100 text-amber-700",
  "em andamento": "bg-blue-100 text-blue-700",
};

const statusLabels: Record<string, string> = {
  visitado: "Visitado",
  pendente: "Pendente",
  "em andamento": "Em andamento",
};

const Mapa = () => {
  const navigate = useNavigate();
  const { signOut, user, role } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<MissionLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MissionLocation | null>(null);
  const [userNotes, setUserNotes] = useState<Record<string, UserNote[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [needsCategories, setNeedsCategories] = useState<any[]>([]);
  usePageTracking("mapa");
  // Draft for new note per location
  const [drafts, setDrafts] = useState<Record<string, UserNote>>({});
  // Reference point ordering & pinning
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  // Mission zone ordering & pinning
  const [mzPinnedIds, setMzPinnedIds] = useState<string[]>([]);
  const [mzCustomOrder, setMzCustomOrder] = useState<string[]>([]);

  const STORAGE_KEY_PINNED = `ref_pinned_${user?.id || "anon"}`;
  const STORAGE_KEY_ORDER = `ref_order_${user?.id || "anon"}`;
  const STORAGE_KEY_MZ_PINNED = `mz_pinned_${user?.id || "anon"}`;
  const STORAGE_KEY_MZ_ORDER = `mz_order_${user?.id || "anon"}`;

  // Load pinned/order from localStorage
  useEffect(() => {
    try {
      const savedPinned = localStorage.getItem(STORAGE_KEY_PINNED);
      const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
      const savedMzPinned = localStorage.getItem(STORAGE_KEY_MZ_PINNED);
      const savedMzOrder = localStorage.getItem(STORAGE_KEY_MZ_ORDER);
      if (savedPinned) setPinnedIds(JSON.parse(savedPinned));
      if (savedOrder) setCustomOrder(JSON.parse(savedOrder));
      if (savedMzPinned) setMzPinnedIds(JSON.parse(savedMzPinned));
      if (savedMzOrder) setMzCustomOrder(JSON.parse(savedMzOrder));
    } catch { /* ignore */ }
  }, [STORAGE_KEY_PINNED, STORAGE_KEY_ORDER, STORAGE_KEY_MZ_PINNED, STORAGE_KEY_MZ_ORDER]);

  const savePinned = useCallback((ids: string[]) => {
    setPinnedIds(ids);
    localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(ids));
  }, [STORAGE_KEY_PINNED]);

  const saveOrder = useCallback((ids: string[]) => {
    setCustomOrder(ids);
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(ids));
  }, [STORAGE_KEY_ORDER]);

  const saveMzPinned = useCallback((ids: string[]) => {
    setMzPinnedIds(ids);
    localStorage.setItem(STORAGE_KEY_MZ_PINNED, JSON.stringify(ids));
  }, [STORAGE_KEY_MZ_PINNED]);

  const saveMzOrder = useCallback((ids: string[]) => {
    setMzCustomOrder(ids);
    localStorage.setItem(STORAGE_KEY_MZ_ORDER, JSON.stringify(ids));
  }, [STORAGE_KEY_MZ_ORDER]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: locs } = await supabase
        .from("mission_locations")
        .select("id, name, address, category, status, google_maps_url")
        .order("created_at", { ascending: false });

      if (locs) {
        const typedLocs = locs as MissionLocation[];
        setLocations(typedLocs);
        if (typedLocs.length > 0) setSelectedLocation(typedLocs[0]);
      }

      const { data: needsData } = await supabase
        .from("needs_categories")
        .select("*")
        .order("created_at", { ascending: true });
      if (needsData) setNeedsCategories(needsData);

      if (user) {
        const { data: notes } = await supabase
          .from("location_user_notes")
          .select("id, location_id, house_number, resident_name, needs, notes, user_address, exact_location_url, summary, accepts_identification, created_at, user_id")
          .order("created_at", { ascending: false });

        if (notes) {
          const userIds = Array.from(new Set(notes.filter((n) => n.user_id).map((n) => n.user_id)));
          const profileMap: Record<string, string> = {};

          if (userIds.length > 0) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds);

            if (profs) {
              profs.forEach((p) => {
                profileMap[p.id] = p.full_name;
              });
            }
          }

          const map: Record<string, UserNote[]> = {};
          (notes as any[]).forEach((n) => {
            const locId = n.location_id;
            if (!map[locId]) map[locId] = [];
            map[locId].push({
              id: n.id,
              location_id: locId,
              house_number: n.house_number || "",
              resident_name: n.resident_name || "",
              needs: n.needs || "",
              notes: n.notes || "",
              user_address: n.user_address || "",
              exact_location_url: n.exact_location_url || "",
              summary: n.summary || "",
              accepts_identification: !!n.accepts_identification,
              created_at: n.created_at,
              user_id: n.user_id,
              user_name: profileMap[n.user_id] || "Usuário",
            });
          });
          setUserNotes(map);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const getDraft = (locationId: string): UserNote => {
    return drafts[locationId] || { location_id: locationId, house_number: "", resident_name: "", needs: "", notes: "", user_address: "", exact_location_url: "", summary: "", accepts_identification: false };
  };

  const updateDraft = (locationId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary", value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [locationId]: {
        ...(prev[locationId] || { location_id: locationId, house_number: "", resident_name: "", needs: "", notes: "", user_address: "", exact_location_url: "", summary: "" }),
        [field]: value,
      },
    }));
  };

  const updateExistingNote = (locationId: string, noteId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary", value: string) => {
    setUserNotes((prev) => ({
      ...prev,
      [locationId]: (prev[locationId] || []).map((n) =>
        n.id === noteId ? { ...n, [field]: value } : n
      ),
    }));
  };

  const saveNewNote = async (locationId: string) => {
    if (!user) return;
    const draft = getDraft(locationId);
    if (!draft.house_number.trim() && !draft.needs.trim() && !draft.notes.trim() && !draft.user_address.trim()) {
      toast({ title: "Preencha ao menos um campo", variant: "destructive" });
      return;
    }
    setSavingId(`new-${locationId}`);

    const { data, error } = await supabase
      .from("location_user_notes")
      .insert({
        location_id: locationId,
        user_id: user.id,
        house_number: draft.house_number.trim() || null,
        resident_name: draft.resident_name.trim() || null,
        needs: draft.needs.trim() || null,
        notes: draft.notes.trim() || null,
        user_address: draft.user_address.trim() || null,
        exact_location_url: draft.exact_location_url.trim() || null,
        summary: draft.summary.trim() || null,
      } as any)
      .select("id, location_id, house_number, resident_name, needs, notes, user_address, exact_location_url, summary, created_at")
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else if (data) {
      const newNote: UserNote = {
        id: (data as any).id,
        location_id: locationId,
        house_number: (data as any).house_number || "",
        resident_name: (data as any).resident_name || "",
        needs: (data as any).needs || "",
        notes: (data as any).notes || "",
        user_address: (data as any).user_address || "",
        exact_location_url: (data as any).exact_location_url || "",
        summary: (data as any).summary || "",
        created_at: (data as any).created_at,
        user_id: user.id,
        user_name: "Você",
      };
      setUserNotes((prev) => ({
        ...prev,
        [locationId]: [newNote, ...(prev[locationId] || [])],
      }));
      setDrafts((prev) => ({ ...prev, [locationId]: { location_id: locationId, house_number: "", resident_name: "", needs: "", notes: "", user_address: "", exact_location_url: "", summary: "" } }));
      toast({ title: "Salvo!", description: "Observação registrada com sucesso." });
    }
    setSavingId(null);
  };

  const saveExistingNote = async (locationId: string, noteId: string) => {
    if (!user) return;
    const note = (userNotes[locationId] || []).find((n) => n.id === noteId);
    if (!note) return;
    setSavingId(noteId);

    const { error } = await supabase
      .from("location_user_notes")
      .update({
        house_number: note.house_number.trim() || null,
        resident_name: note.resident_name.trim() || null,
        needs: note.needs.trim() || null,
        notes: note.notes.trim() || null,
        user_address: note.user_address.trim() || null,
        exact_location_url: note.exact_location_url.trim() || null,
        summary: note.summary.trim() || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", noteId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Atualizado!", description: "Observação atualizada." });
    }
    setSavingId(null);
  };

  const deleteNote = async (locationId: string, noteId: string) => {
    if (!user) return;
    setSavingId(noteId);
    const { error } = await supabase.from("location_user_notes").delete().eq("id", noteId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setUserNotes((prev) => ({
        ...prev,
        [locationId]: (prev[locationId] || []).filter((n) => n.id !== noteId),
      }));
      toast({ title: "Removido", description: "Observação removida." });
    }
    setSavingId(null);
  };

  const filteredLocations = selectedStatus
    ? locations.filter((l) => l.status === selectedStatus)
    : locations;

  const getStats = (locs: MissionLocation[]) => ({
    visitado: locs.filter((l) => l.status === "visitado").length,
    pendente: locs.filter((l) => l.status === "pendente").length,
    emAndamento: locs.filter((l) => l.status === "em andamento").length,
  });

  const referencePointsRaw = filteredLocations.filter((l) => l.category === "reference_point");
  
  // Sort reference points: pinned first, then custom order, then default
  const sortedReferencePoints = [...referencePointsRaw].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    const aOrder = customOrder.indexOf(a.id);
    const bOrder = customOrder.indexOf(b.id);
    if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
    if (aOrder !== -1) return -1;
    if (bOrder !== -1) return 1;
    return 0;
  });

  const handleTogglePin = (id: string) => {
    if (pinnedIds.includes(id)) {
      savePinned(pinnedIds.filter((p) => p !== id));
    } else if (pinnedIds.length < 2) {
      savePinned([...pinnedIds, id]);
    }
  };

  const handleMoveRef = (id: string, direction: "up" | "down") => {
    const currentIds = sortedReferencePoints.map((l) => l.id);
    const idx = currentIds.indexOf(id);
    if (direction === "up" && idx > 0) {
      [currentIds[idx - 1], currentIds[idx]] = [currentIds[idx], currentIds[idx - 1]];
    } else if (direction === "down" && idx < currentIds.length - 1) {
      [currentIds[idx + 1], currentIds[idx]] = [currentIds[idx], currentIds[idx + 1]];
    }
    saveOrder(currentIds);
  };

  const handleToggleMzPin = (id: string) => {
    if (mzPinnedIds.includes(id)) {
      saveMzPinned(mzPinnedIds.filter((p) => p !== id));
    } else if (mzPinnedIds.length < 2) {
      saveMzPinned([...mzPinnedIds, id]);
    }
  };

  const missionZonesRaw = filteredLocations.filter((l) => l.category === "mission_zone");

  const sortedMissionZones = [...missionZonesRaw].sort((a, b) => {
    const aPinned = mzPinnedIds.includes(a.id);
    const bPinned = mzPinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    const aOrder = mzCustomOrder.indexOf(a.id);
    const bOrder = mzCustomOrder.indexOf(b.id);
    if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
    if (aOrder !== -1) return -1;
    if (bOrder !== -1) return 1;
    return 0;
  });

  const handleMoveMz = (id: string, direction: "up" | "down") => {
    const currentIds = sortedMissionZones.map((l) => l.id);
    const idx = currentIds.indexOf(id);
    if (direction === "up" && idx > 0) {
      [currentIds[idx - 1], currentIds[idx]] = [currentIds[idx], currentIds[idx - 1]];
    } else if (direction === "down" && idx < currentIds.length - 1) {
      [currentIds[idx + 1], currentIds[idx]] = [currentIds[idx], currentIds[idx + 1]];
    }
    saveMzOrder(currentIds);
  };

  const missionZones = sortedMissionZones;

  // Build Google Maps embed URL
  const getEmbedUrl = (loc: MissionLocation | null) => {
    if (!loc) return null;
    const encodedAddress = encodeURIComponent(loc.address);
    return `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  const embedUrl = getEmbedUrl(selectedLocation);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Mapa de Missão" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        {/* Interactive Map */}
        <div className="w-full rounded-2xl overflow-hidden shadow-card animate-fade-in bg-muted">
          {embedUrl ? (
            <div className="relative">
              <iframe
                src={embedUrl}
                width="100%"
                height="220"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Mapa: ${selectedLocation?.name || "Local"}`}
                className="w-full"
              />
              {selectedLocation && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-primary-foreground text-sm font-semibold">{selectedLocation.name}</p>
                  <p className="text-primary-foreground/80 text-xs">{selectedLocation.address}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center">
              <Navigation size={40} className="text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">Nenhum local selecionado</p>
            </div>
          )}
        </div>

        {/* Direction link */}
        {selectedLocation?.google_maps_url && (
          <a
            href={selectedLocation.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-card transition-all hover:opacity-90 animate-fade-in"
          >
            <Navigation size={16} /> Abrir direção no Google Maps
          </a>
        )}

        <Tabs defaultValue="reference_point" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="reference_point">Pontos de Referência</TabsTrigger>
            <TabsTrigger value="mission_zone">Zonas de Missão</TabsTrigger>
          </TabsList>

          <TabsContent value="reference_point" className="space-y-5">
            <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : sortedReferencePoints.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhum ponto de referência cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {sortedReferencePoints.map((loc, idx) => (
                    <ReferencePointCard
                      key={loc.id}
                      loc={loc}
                      isSelected={selectedLocation?.id === loc.id}
                      onSelect={() => setSelectedLocation(loc)}
                      isPinned={pinnedIds.includes(loc.id)}
                      onTogglePin={() => handleTogglePin(loc.id)}
                      canPinMore={pinnedIds.length < 2}
                      onMoveUp={idx > 0 ? () => handleMoveRef(loc.id, "up") : null}
                      onMoveDown={idx < sortedReferencePoints.length - 1 ? () => handleMoveRef(loc.id, "down") : null}
                    />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="mission_zone" className="space-y-5">
            {/* Stats Mission Zones */}
            <div className="grid grid-cols-3 gap-2 animate-fade-in">
              <button
                onClick={() => setSelectedStatus(selectedStatus === "pendente" ? null : "pendente")}
                className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "pendente" ? "ring-2 ring-amber-500" : ""} bg-card shadow-card`}
              >
                <p className="text-xl font-bold text-amber-600">{getStats(locations.filter(l => l.category === 'mission_zone')).pendente}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Pendentes</p>
              </button>
              <button
                onClick={() => setSelectedStatus(selectedStatus === "em andamento" ? null : "em andamento")}
                className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "em andamento" ? "ring-2 ring-blue-500" : ""} bg-card shadow-card`}
              >
                <p className="text-xl font-bold text-blue-600">{getStats(locations.filter(l => l.category === 'mission_zone')).emAndamento}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Em andamento</p>
              </button>
              <button
                onClick={() => setSelectedStatus(selectedStatus === "visitado" ? null : "visitado")}
                className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "visitado" ? "ring-2 ring-green-500" : ""} bg-card shadow-card`}
              >
                <p className="text-xl font-bold text-green-600">{getStats(locations.filter(l => l.category === 'mission_zone')).visitado}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Visitados</p>
              </button>
            </div>

            {/* Locations */}
            <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : missionZones.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma zona de missão cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {missionZones.map((loc, idx) => (
                    <LocationCard
                      key={loc.id}
                      loc={loc}
                      notes={userNotes[loc.id] || []}
                      isSelected={selectedLocation?.id === loc.id}
                      onSelect={() => setSelectedLocation(loc)}
                      draft={getDraft(loc.id)}
                      updateDraft={updateDraft}
                      saveNewNote={saveNewNote}
                      updateExistingNote={updateExistingNote}
                      saveExistingNote={saveExistingNote}
                      deleteNote={deleteNote}
                      savingId={savingId}
                      needsCategories={needsCategories}
                      userId={user?.id || ""}
                      role={role}
                      isPinned={mzPinnedIds.includes(loc.id)}
                      onTogglePin={() => handleToggleMzPin(loc.id)}
                      canPinMore={mzPinnedIds.length < 2}
                      onMoveUp={idx > 0 ? () => handleMoveMz(loc.id, "up") : null}
                      onMoveDown={idx < missionZones.length - 1 ? () => handleMoveMz(loc.id, "down") : null}
                    />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default Mapa;

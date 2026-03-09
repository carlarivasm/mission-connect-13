import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ExternalLink, Save, Navigation, ChevronDown, ChevronUp, Plus, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MissionLocation {
  id: string;
  name: string;
  address: string;
  status: string;
  google_maps_url: string | null;
}

interface UserNote {
  id?: string;
  location_id: string;
  house_number: string;
  needs: string;
  notes: string;
  user_address: string;
  created_at?: string;
}

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
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<MissionLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MissionLocation | null>(null);
  const [userNotes, setUserNotes] = useState<Record<string, UserNote[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  // Draft for new note per location
  const [drafts, setDrafts] = useState<Record<string, UserNote>>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data: locs } = await supabase
        .from("mission_locations")
        .select("id, name, address, status, google_maps_url")
        .order("created_at", { ascending: false });

      if (locs) {
        const typedLocs = locs as MissionLocation[];
        setLocations(typedLocs);
        if (typedLocs.length > 0) setSelectedLocation(typedLocs[0]);
      }

      if (user) {
        const { data: notes } = await supabase
          .from("location_user_notes")
          .select("id, location_id, house_number, needs, notes, user_address, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (notes) {
          const map: Record<string, UserNote[]> = {};
          (notes as any[]).forEach((n) => {
            const locId = n.location_id;
            if (!map[locId]) map[locId] = [];
            map[locId].push({
              id: n.id,
              location_id: locId,
              house_number: n.house_number || "",
              needs: n.needs || "",
              notes: n.notes || "",
              user_address: n.user_address || "",
              created_at: n.created_at,
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
    return drafts[locationId] || { location_id: locationId, needs: "", notes: "", user_address: "" };
  };

  const updateDraft = (locationId: string, field: "needs" | "notes" | "user_address", value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [locationId]: {
        ...(prev[locationId] || { location_id: locationId, needs: "", notes: "", user_address: "" }),
        [field]: value,
      },
    }));
  };

  const updateExistingNote = (locationId: string, noteId: string, field: "needs" | "notes" | "user_address", value: string) => {
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
    if (!draft.needs.trim() && !draft.notes.trim() && !draft.user_address.trim()) {
      toast({ title: "Preencha ao menos um campo", variant: "destructive" });
      return;
    }
    setSavingId(`new-${locationId}`);

    const { data, error } = await supabase
      .from("location_user_notes")
      .insert({
        location_id: locationId,
        user_id: user.id,
        needs: draft.needs.trim() || null,
        notes: draft.notes.trim() || null,
        user_address: draft.user_address.trim() || null,
      } as any)
      .select("id, location_id, needs, notes, user_address, created_at")
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else if (data) {
      const newNote: UserNote = {
        id: (data as any).id,
        location_id: locationId,
        needs: (data as any).needs || "",
        notes: (data as any).notes || "",
        user_address: (data as any).user_address || "",
        created_at: (data as any).created_at,
      };
      setUserNotes((prev) => ({
        ...prev,
        [locationId]: [newNote, ...(prev[locationId] || [])],
      }));
      setDrafts((prev) => ({ ...prev, [locationId]: { location_id: locationId, needs: "", notes: "", user_address: "" } }));
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
        needs: note.needs.trim() || null,
        notes: note.notes.trim() || null,
        user_address: note.user_address.trim() || null,
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

  const stats = {
    visitado: locations.filter((l) => l.status === "visitado").length,
    pendente: locations.filter((l) => l.status === "pendente").length,
    emAndamento: locations.filter((l) => l.status === "em andamento").length,
  };

  // Build Google Maps embed URL
  const getEmbedUrl = (loc: MissionLocation | null) => {
    if (!loc) return null;
    // If admin set a google_maps_url with directions, try to extract and use it
    // Otherwise embed the address
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 animate-fade-in">
          <button
            onClick={() => setSelectedStatus(selectedStatus === "visitado" ? null : "visitado")}
            className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "visitado" ? "ring-2 ring-green-500" : ""} bg-card shadow-card`}
          >
            <p className="text-xl font-bold text-green-600">{stats.visitado}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Visitados</p>
          </button>
          <button
            onClick={() => setSelectedStatus(selectedStatus === "em andamento" ? null : "em andamento")}
            className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "em andamento" ? "ring-2 ring-blue-500" : ""} bg-card shadow-card`}
          >
            <p className="text-xl font-bold text-blue-600">{stats.emAndamento}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Em andamento</p>
          </button>
          <button
            onClick={() => setSelectedStatus(selectedStatus === "pendente" ? null : "pendente")}
            className={`p-3 rounded-xl text-center transition-all ${selectedStatus === "pendente" ? "ring-2 ring-amber-500" : ""} bg-card shadow-card`}
          >
            <p className="text-xl font-bold text-amber-600">{stats.pendente}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Pendentes</p>
          </button>
        </div>

        {/* Locations */}
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
            Locais de Missão {selectedStatus && `(${statusLabels[selectedStatus]})`}
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum local cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {filteredLocations.map((loc) => {
                const notes = userNotes[loc.id] || [];
                const draft = getDraft(loc.id);
                const isSelected = selectedLocation?.id === loc.id;
                return (
                  <div
                    key={loc.id}
                    className={`p-4 bg-card rounded-xl shadow-card space-y-3 transition-all cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedLocation(loc)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg gradient-mission text-primary-foreground mt-0.5">
                        <MapPin size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground">{loc.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[loc.status] || "bg-muted text-muted-foreground"}`}>
                            {statusLabels[loc.status] || loc.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                        {loc.google_maps_url && (
                          <a
                            href={loc.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={10} /> Abrir direção no Maps
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Expand/collapse notes toggle */}
                    <div className="pt-2 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setExpandedNotes(prev => ({ ...prev, [loc.id]: !prev[loc.id] }))}
                        className="flex items-center gap-2 w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        <FileText size={14} />
                        {notes.length > 0
                          ? `Ver observações (${notes.length})`
                          : "Adicionar observações"}
                        {expandedNotes[loc.id] ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
                      </button>

                      {/* Saved notes preview (when collapsed) */}
                      {!expandedNotes[loc.id] && notes.length > 0 && (
                        <div className="text-xs text-muted-foreground space-y-1 pl-6">
                          {notes.slice(0, 2).map((note, idx) => (
                            <div key={note.id || idx} className="space-y-0.5">
                              {note.user_address && <p><span className="font-semibold">Complemento:</span> {note.user_address}</p>}
                              {note.needs && <p><span className="font-semibold">Necessidades:</span> {note.needs}</p>}
                              {note.notes && <p><span className="font-semibold">Observações:</span> {note.notes}</p>}
                            </div>
                          ))}
                          {notes.length > 2 && (
                            <p className="text-primary font-semibold">+{notes.length - 2} mais...</p>
                          )}
                        </div>
                      )}

                      {/* Expanded: list existing notes + new note form */}
                      {expandedNotes[loc.id] && (
                        <div className="space-y-3">
                          {/* Existing notes */}
                          {notes.map((note) => (
                            <div key={note.id} className="p-3 bg-muted/50 rounded-lg space-y-2 border border-border">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Complemento do endereço</label>
                                <Textarea
                                  value={note.user_address || ""}
                                  onChange={(e) => updateExistingNote(loc.id, note.id!, "user_address", e.target.value)}
                                  placeholder="Apt, bloco, referência..."
                                  rows={1}
                                  className="text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Necessidades identificadas</label>
                                <Textarea
                                  value={note.needs}
                                  onChange={(e) => updateExistingNote(loc.id, note.id!, "needs", e.target.value)}
                                  placeholder="Descreva as necessidades..."
                                  rows={2}
                                  className="text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Observações</label>
                                <Textarea
                                  value={note.notes}
                                  onChange={(e) => updateExistingNote(loc.id, note.id!, "notes", e.target.value)}
                                  placeholder="Anotações adicionais..."
                                  rows={2}
                                  className="text-xs"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => saveExistingNote(loc.id, note.id!)}
                                  disabled={savingId === note.id}
                                  className="gap-1 gradient-mission text-primary-foreground"
                                >
                                  <Save size={12} />
                                  {savingId === note.id ? "Salvando..." : "Salvar"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteNote(loc.id, note.id!)}
                                  disabled={savingId === note.id}
                                  className="gap-1"
                                >
                                  <Trash2 size={12} /> Remover
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* New note form */}
                          <div className="p-3 bg-primary/5 rounded-lg space-y-2 border-2 border-dashed border-primary/30">
                            <p className="text-xs font-bold text-primary flex items-center gap-1">
                              <Plus size={14} /> Nova observação
                            </p>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground">Complemento do endereço</label>
                              <Textarea
                                value={draft.user_address || ""}
                                onChange={(e) => updateDraft(loc.id, "user_address", e.target.value)}
                                placeholder="Apt, bloco, referência..."
                                rows={1}
                                className="text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground">Necessidades identificadas</label>
                              <Textarea
                                value={draft.needs}
                                onChange={(e) => updateDraft(loc.id, "needs", e.target.value)}
                                placeholder="Descreva as necessidades..."
                                rows={2}
                                className="text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground">Observações</label>
                              <Textarea
                                value={draft.notes}
                                onChange={(e) => updateDraft(loc.id, "notes", e.target.value)}
                                placeholder="Anotações adicionais..."
                                rows={2}
                                className="text-xs"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => saveNewNote(loc.id)}
                              disabled={savingId === `new-${loc.id}`}
                              className="gap-1 gradient-mission text-primary-foreground"
                            >
                              <Plus size={12} />
                              {savingId === `new-${loc.id}` ? "Salvando..." : "Adicionar observação"}
                            </Button>
                          </div>

                          {/* Google Maps link */}
                          {loc.google_maps_url && (
                            <a
                              href={loc.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 text-primary font-semibold text-xs hover:bg-primary/20 transition-colors"
                            >
                              <Navigation size={14} /> Abrir direção no Google Maps
                            </a>
                          )}
                        </div>
                      )}

                      {/* Google Maps link when collapsed */}
                      {!expandedNotes[loc.id] && loc.google_maps_url && (
                        <a
                          href={loc.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 text-primary font-semibold text-xs hover:bg-primary/20 transition-colors"
                        >
                          <Navigation size={14} /> Abrir direção no Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default Mapa;

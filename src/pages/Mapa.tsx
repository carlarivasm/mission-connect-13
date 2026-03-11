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
import NeedsCheckboxes from "@/components/NeedsCheckboxes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  resident_name: string;
  needs: string;
  notes: string;
  user_address: string;
  created_at?: string;
}

const Mapa = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<MissionLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNotes, setUserNotes] = useState<Record<string, UserNote[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, UserNote>>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data: locs } = await supabase
        .from("mission_locations")
        .select("id, name, address, status, google_maps_url")
        .order("created_at", { ascending: false });

      if (locs) setLocations(locs as MissionLocation[]);

      if (user) {
        const { data: notes } = await supabase
          .from("location_user_notes")
          .select("id, location_id, house_number, resident_name, needs, notes, user_address, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (notes) {
          const map: Record<string, UserNote[]> = {};
          (notes as any[]).forEach((n) => {
            const locId = n.location_id;
            if (!map[locId]) map[locId] = [];
            map[locId].push({
              id: n.id, location_id: locId,
              house_number: n.house_number || "", resident_name: n.resident_name || "",
              needs: n.needs || "", notes: n.notes || "",
              user_address: n.user_address || "", created_at: n.created_at,
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

  const getDraft = (locationId: string): UserNote =>
    drafts[locationId] || { location_id: locationId, house_number: "", resident_name: "", needs: "", notes: "", user_address: "" };

  const updateDraft = (locationId: string, field: keyof Omit<UserNote, "id" | "location_id" | "created_at">, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [locationId]: {
        ...(prev[locationId] || { location_id: locationId, house_number: "", resident_name: "", needs: "", notes: "", user_address: "" }),
        [field]: value,
      },
    }));
  };

  const updateExistingNote = (locationId: string, noteId: string, field: keyof Omit<UserNote, "id" | "location_id" | "created_at">, value: string) => {
    setUserNotes((prev) => ({
      ...prev,
      [locationId]: (prev[locationId] || []).map((n) => n.id === noteId ? { ...n, [field]: value } : n),
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
        location_id: locationId, user_id: user.id,
        house_number: draft.house_number.trim() || null, resident_name: draft.resident_name.trim() || null,
        needs: draft.needs.trim() || null, notes: draft.notes.trim() || null,
        user_address: draft.user_address.trim() || null,
      } as any)
      .select("id, location_id, house_number, resident_name, needs, notes, user_address, created_at")
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else if (data) {
      const d = data as any;
      setUserNotes((prev) => ({
        ...prev,
        [locationId]: [{ id: d.id, location_id: locationId, house_number: d.house_number || "", resident_name: d.resident_name || "", needs: d.needs || "", notes: d.notes || "", user_address: d.user_address || "", created_at: d.created_at }, ...(prev[locationId] || [])],
      }));
      setDrafts((prev) => ({ ...prev, [locationId]: { location_id: locationId, house_number: "", resident_name: "", needs: "", notes: "", user_address: "" } }));
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
        house_number: note.house_number.trim() || null, resident_name: note.resident_name.trim() || null,
        needs: note.needs.trim() || null, notes: note.notes.trim() || null,
        user_address: note.user_address.trim() || null, updated_at: new Date().toISOString(),
      } as any)
      .eq("id", noteId);

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Atualizado!", description: "Observação atualizada." });
    setSavingId(null);
  };

  const deleteNote = async (locationId: string, noteId: string) => {
    if (!user) return;
    setSavingId(noteId);
    const { error } = await supabase.from("location_user_notes").delete().eq("id", noteId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setUserNotes((prev) => ({ ...prev, [locationId]: (prev[locationId] || []).filter((n) => n.id !== noteId) }));
      toast({ title: "Removido", description: "Observação removida." });
    }
    setSavingId(null);
  };

  const getEmbedUrl = (loc: MissionLocation) => {
    const encodedAddress = encodeURIComponent(loc.address);
    return `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  const fixos = locations.filter((l) => l.status === "pendente");
  const emAndamento = locations.filter((l) => l.status === "em andamento");
  const visitados = locations.filter((l) => l.status === "visitado");

  /** Renders the note form fields */
  const renderNoteFields = (
    note: UserNote,
    onChange: (field: keyof Omit<UserNote, "id" | "location_id" | "created_at">, value: string) => void,
    readOnly?: boolean
  ) => (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Nº da casa / identificação</label>
        <input type="text" value={note.house_number || ""} onChange={(e) => onChange("house_number", e.target.value)} readOnly={readOnly}
          placeholder="Ex: 123, 45A, S/N..."
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 read-only:opacity-70" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Nome do morador</label>
        <input type="text" value={note.resident_name || ""} onChange={(e) => onChange("resident_name", e.target.value)} readOnly={readOnly}
          placeholder="Nome de quem mora na casa..."
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 read-only:opacity-70" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Complemento do endereço</label>
        <Textarea value={note.user_address || ""} onChange={(e) => onChange("user_address", e.target.value)} readOnly={readOnly}
          placeholder="Apt, bloco, referência..." rows={1} className="text-xs" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Necessidades identificadas</label>
        {readOnly ? (
          <p className="text-xs text-foreground bg-muted/50 rounded p-2">{note.needs || "—"}</p>
        ) : (
          <NeedsCheckboxes value={note.needs} onChange={(val) => onChange("needs", val)} />
        )}
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Observações</label>
        <Textarea value={note.notes} onChange={(e) => onChange("notes", e.target.value)} readOnly={readOnly}
          placeholder="Anotações adicionais..." rows={2} className="text-xs" />
      </div>
    </div>
  );

  /** Renders a location card with optional map, notes section */
  const renderLocationCard = (loc: MissionLocation, mode: "fixed" | "active" | "visited") => {
    const notes = userNotes[loc.id] || [];
    const draft = getDraft(loc.id);
    const showMap = expandedMap[loc.id];
    const allowNewNotes = mode === "active";
    const allowEditNotes = mode === "active" || mode === "visited";
    const showNotesSection = mode !== "fixed";

    return (
      <div key={loc.id} className="p-4 bg-card rounded-xl shadow-card space-y-3 animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg text-primary-foreground mt-0.5 ${mode === "fixed" ? "bg-amber-500" : mode === "active" ? "bg-blue-500" : "bg-green-500"}`}>
            <MapPin size={16} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">{loc.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
            {loc.google_maps_url && (
              <a href={loc.google_maps_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                <ExternalLink size={10} /> Abrir direção no Maps
              </a>
            )}
          </div>
        </div>

        {/* Toggle map */}
        <button
          onClick={() => setExpandedMap((prev) => ({ ...prev, [loc.id]: !prev[loc.id] }))}
          className="flex items-center gap-2 w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Navigation size={14} />
          {showMap ? "Ocultar mapa" : "Ver mapa"}
          {showMap ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
        </button>

        {showMap && (
          <div className="rounded-xl overflow-hidden shadow-card">
            <iframe src={getEmbedUrl(loc)} width="100%" height="200" style={{ border: 0 }} allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title={`Mapa: ${loc.name}`} className="w-full" />
          </div>
        )}

        {/* Notes section */}
        {showNotesSection && (
          <div className="pt-2 border-t border-border space-y-2">
            <button
              onClick={() => setExpandedNotes((prev) => ({ ...prev, [loc.id]: !prev[loc.id] }))}
              className="flex items-center gap-2 w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <FileText size={14} />
              {notes.length > 0 ? `Ver observações (${notes.length})` : allowNewNotes ? "Adicionar observações" : "Sem observações"}
              {expandedNotes[loc.id] ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
            </button>

            {/* Preview when collapsed */}
            {!expandedNotes[loc.id] && notes.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 pl-6">
                {notes.slice(0, 2).map((note, idx) => (
                  <div key={note.id || idx} className="space-y-0.5">
                    {note.house_number && <p><span className="font-semibold">Nº Casa:</span> {note.house_number}</p>}
                    {note.resident_name && <p><span className="font-semibold">Morador:</span> {note.resident_name}</p>}
                    {note.needs && <p><span className="font-semibold">Necessidades:</span> {note.needs}</p>}
                  </div>
                ))}
                {notes.length > 2 && <p className="text-primary font-semibold">+{notes.length - 2} mais...</p>}
              </div>
            )}

            {/* Expanded notes */}
            {expandedNotes[loc.id] && (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 bg-muted/50 rounded-lg space-y-2 border border-border">
                    {renderNoteFields(note, (field, val) => updateExistingNote(loc.id, note.id!, field, val))}
                    {allowEditNotes && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveExistingNote(loc.id, note.id!)} disabled={savingId === note.id}
                          className="gap-1 gradient-mission text-primary-foreground">
                          <Save size={12} /> {savingId === note.id ? "Salvando..." : "Salvar"}
                        </Button>
                        {mode === "active" && (
                          <Button size="sm" variant="destructive" onClick={() => deleteNote(loc.id, note.id!)} disabled={savingId === note.id} className="gap-1">
                            <Trash2 size={12} /> Remover
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* New note form — only for "em andamento" */}
                {allowNewNotes && (
                  <div className="p-3 bg-primary/5 rounded-lg space-y-2 border-2 border-dashed border-primary/30">
                    <p className="text-xs font-bold text-primary flex items-center gap-1"><Plus size={14} /> Nova observação</p>
                    {renderNoteFields(draft, (field, val) => updateDraft(loc.id, field, val))}
                    <Button size="sm" onClick={() => saveNewNote(loc.id)} disabled={savingId === `new-${loc.id}`}
                      className="gap-1 gradient-mission text-primary-foreground">
                      <Plus size={12} /> {savingId === `new-${loc.id}` ? "Salvando..." : "Adicionar observação"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLocationList = (locs: MissionLocation[], mode: "fixed" | "active" | "visited", emptyMsg: string) => {
    if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
    if (locs.length === 0) return <p className="text-muted-foreground text-sm text-center py-4">{emptyMsg}</p>;
    return <div className="space-y-3">{locs.map((loc) => renderLocationCard(loc, mode))}</div>;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Mapa de Missão" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 animate-fade-in">
          <div className="p-3 rounded-xl text-center bg-card shadow-card">
            <p className="text-xl font-bold text-amber-600">{fixos.length}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Locais Fixos</p>
          </div>
          <div className="p-3 rounded-xl text-center bg-card shadow-card">
            <p className="text-xl font-bold text-blue-600">{emAndamento.length}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Em Andamento</p>
          </div>
          <div className="p-3 rounded-xl text-center bg-card shadow-card">
            <p className="text-xl font-bold text-green-600">{visitados.length}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Visitados</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="fixed" className="w-full animate-fade-in">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="fixed" className="text-xs">Locais Fixos</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Em Andamento</TabsTrigger>
            <TabsTrigger value="visited" className="text-xs">Visitados</TabsTrigger>
          </TabsList>

          <TabsContent value="fixed" className="mt-3">
            {renderLocationList(fixos, "fixed", "Nenhum local fixo cadastrado.")}
          </TabsContent>
          <TabsContent value="active" className="mt-3">
            {renderLocationList(emAndamento, "active", "Nenhum local em andamento.")}
          </TabsContent>
          <TabsContent value="visited" className="mt-3">
            {renderLocationList(visitados, "visited", "Nenhum local visitado.")}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default Mapa;

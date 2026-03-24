import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, MapPinPlus, Pencil, Eye, Download, ExternalLink, ClipboardList, X, ChevronDown } from "lucide-react";
import { ManageNeeds } from "./ManageNeeds";
import { TEAM_COLOR_OPTIONS } from "./ManageOrgTeams";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportToExcel } from "@/lib/excel";
import { renderNeedsNames } from "@/lib/utils";

interface MissionLocation {
  id: string;
  name: string;
  address: string;
  category: string;
  status: string;
  google_maps_url: string | null;
}

interface UserNote {
  id: string;
  location_id: string;
  user_id: string;
  needs: string | null;
  notes: string | null;
  created_at: string;
  location_name?: string;
  location_address?: string;
  user_email?: string;
  team_color?: string | null;
}

const ManageLocations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [locations, setLocations] = useState<MissionLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("reference_point");
  const [status, setStatus] = useState("pendente");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // User notes viewing
  const [showNotes, setShowNotes] = useState(false);
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const toggleExpandNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Collapsible sections
  const [showNeedsManager, setShowNeedsManager] = useState(false);
  const [showNewLocation, setShowNewLocation] = useState(false);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("mission_locations")
      .select("id, name, address, category, status, google_maps_url")
      .order("created_at", { ascending: false });
    if (data) setLocations(data as MissionLocation[]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  const resetForm = () => {
    setName(""); setAddress(""); setCategory("reference_point"); setStatus("pendente"); setGoogleMapsUrl(""); setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      address: address.trim(),
      category,
      status,
      google_maps_url: googleMapsUrl.trim() || null,
      created_by: user?.id,
    };

    if (editingId) {
      const { error } = await supabase.from("mission_locations").update(payload as any).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Local atualizado!" }); resetForm(); fetchLocations(); }
    } else {
      const { error } = await supabase.from("mission_locations").insert(payload as any);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Local adicionado!" });
        // Send notifications to users with locations enabled
        const { data: allProfiles } = await supabase.from("profiles").select("id, notify_locations");
        if (allProfiles) {
          const notifs = allProfiles
            .filter((p: any) => p.id !== user?.id && p.notify_locations !== false)
            .map((p: any) => ({
              user_id: p.id,
              title: "📍 Novo local de missão",
              message: `"${name.trim()}" foi adicionado ao mapa.`,
              type: "new_location",
            }));
          if (notifs.length > 0) {
            await supabase.from("notifications").insert(notifs as any);
          }
        }
        resetForm();
        fetchLocations();
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (loc: MissionLocation) => {
    setEditingId(loc.id);
    setName(loc.name);
    setAddress(loc.address);
    setCategory(loc.category);
    setStatus(loc.status);
    setGoogleMapsUrl(loc.google_maps_url || "");
    setShowNewLocation(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mission_locations").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchLocations();
    setDeleteConfirm(null);
  };

  const fetchUserNotes = async () => {
    setShowNotes(true);
    setLoadingNotes(true);

    const { data: notes } = await supabase
      .from("location_user_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (notes && notes.length > 0) {
      // Get location names
      const locationIds = [...new Set(notes.map((n: any) => n.location_id))];
      const { data: locs } = await supabase
        .from("mission_locations")
        .select("id, name, address")
        .in("id", locationIds);

      // Get user emails from profiles
      const userIds = [...new Set(notes.map((n: any) => n.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const { data: categories } = await supabase
        .from("needs_categories")
        .select("id, name");

      const { data: orgPositions } = await supabase
        .from("org_positions")
        .select("profile_id, function_name")
        .in("profile_id", userIds)
        .in("category", ["equipe", "responsavel_equipe"]);

      const { data: colorSettings } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "org_team_colors")
        .maybeSingle();

      const teamMap: Record<string, string> = {};
      (orgPositions || []).forEach((p: any) => {
        if (p.profile_id && p.function_name) teamMap[p.profile_id] = p.function_name;
      });

      let teamColors: Record<string, string> = {};
      if (colorSettings?.setting_value) {
        try {
          teamColors = JSON.parse(colorSettings.setting_value);
        } catch {}
      }

      const enriched: UserNote[] = (notes as any[]).map((n) => {
        const loc = locs?.find((l: any) => l.id === n.location_id);
        const profile = profiles?.find((p: any) => p.id === n.user_id);
        return {
          ...n,
          needs: renderNeedsNames(n.needs, categories || []),
          location_name: loc?.name || "—",
          location_address: loc?.address || "",
          user_email: teamMap[n.user_id] || "Sem equipe",
          team_color: teamMap[n.user_id] ? teamColors[teamMap[n.user_id]] || null : null,
        };
      });
      setUserNotes(enriched);
    } else {
      setUserNotes([]);
    }
    setLoadingNotes(false);
  };

  const exportUserNotes = () => {
    if (userNotes.length === 0) return;
    const rows = userNotes.map((n) => ({
      Local: n.location_name || "",
      Endereço: n.location_address || "",
      Missionário: n.user_email || "",
      Necessidades: n.needs || "",
      Observações: n.notes || "",
      Data: new Date(n.created_at).toLocaleDateString("pt-BR"),
    }));
    exportToExcel(rows, "Observações", "observacoes_locais_missao.xlsx");
  };

  const statusColors: Record<string, string> = {
    pendente: "bg-amber-100 text-amber-700",
    visitado: "bg-green-100 text-green-700",
    "em andamento": "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      {/* Gerenciar Necessidades - collapsible */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <button onClick={() => setShowNeedsManager(!showNeedsManager)} className="flex items-center gap-2 w-full text-left">
          <ClipboardList size={14} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Gerenciar Necessidades</h4>
          <span className="text-xs text-muted-foreground ml-auto">{showNeedsManager ? "▲" : "▼"}</span>
        </button>
        {showNeedsManager && <ManageNeeds />}
      </div>

      {/* Novo Local de Missão - collapsible */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <button onClick={() => setShowNewLocation(!showNewLocation)} className="flex items-center gap-2 w-full text-left">
          <MapPinPlus size={14} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">{editingId ? "Editar Local" : "Novo Local de Missão"}</h4>
          <span className="text-xs text-muted-foreground ml-auto">{showNewLocation ? "▲" : "▼"}</span>
        </button>
        {showNewLocation && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do local" required />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em andamento">Em Andamento</SelectItem>
                      <SelectItem value="visitado">Visitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reference_point">Ponto de referência</SelectItem>
                      <SelectItem value="mission_zone">Zona de missão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Endereço</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" required />
              </div>
              <div className="space-y-1">
                <Label>Link Google Maps (direção casa de retiro → local)</Label>
                <Input
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  type="url"
                />
                <p className="text-[10px] text-muted-foreground">Cole o link de direção do Google Maps da casa de retiro até o local de missão.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="gradient-mission text-primary-foreground">
                {submitting ? "Salvando..." : editingId ? "Atualizar" : "Adicionar Local"}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
            </div>
          </form>
        )}
      </div>

      {/* View user notes button */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={fetchUserNotes} className="gap-1">
          <Eye size={14} /> Ver Observações dos Missionários
        </Button>
      </div>

      {/* Location list */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
        ) : locations.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum local cadastrado.</p>
        ) : (
          locations.map((loc) => (
            <div key={loc.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{loc.name}</p>
                <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                {loc.google_maps_url && (
                  <a
                    href={loc.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <ExternalLink size={10} /> Ver no Maps
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0 items-end">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${loc.category === 'mission_zone' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                  {loc.category === "mission_zone" ? "Zona" : "Referência"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[loc.status] || "bg-muted text-muted-foreground"}`}>
                  {loc.status}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleEdit(loc)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => setDeleteConfirm(loc.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O local e todas as observações dos missionários serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User notes dialog via portal */}
      {showNotes && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-4"
          style={{ paddingTop: "68px", paddingBottom: "72px" }}
          onClick={() => setShowNotes(false)}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" style={{ zIndex: -1 }} />

          {/* Panel shape and scroll rules */}
          <div
            className="relative w-full max-w-lg bg-background shadow-2xl flex flex-col min-h-0 rounded-2xl"
            style={{ maxHeight: "calc(100dvh - 68px - 72px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <h3 className="font-bold text-foreground">Observações</h3>
              <div className="flex items-center gap-2">
                {userNotes.length > 0 && (
                  <Button size="sm" variant="outline" onClick={exportUserNotes} className="gap-1 h-8 px-2 text-xs">
                    <Download size={14} /> Excel
                  </Button>
                )}
                <button
                  onClick={() => setShowNotes(false)}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                  aria-label="Manter aberto"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {loadingNotes ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : userNotes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma observação registrada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {userNotes.map((n) => {
                    const isExpanded = expandedNotes.has(n.id);
                    const colorObj = n.team_color ? TEAM_COLOR_OPTIONS.find(c => c.value === n.team_color) : null;
                    
                    return (
                      <div key={n.id} className="bg-card rounded-xl shadow-sm border border-border/60 overflow-hidden transition-all duration-200">
                        {/* Header */}
                        <button 
                          onClick={() => toggleExpandNote(n.id)}
                          className="w-full flex items-start justify-between p-3 text-left hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-semibold text-sm text-primary truncate">{n.location_name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {colorObj && (
                                <div 
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                                  style={{ backgroundColor: `hsl(${colorObj.hsl})` }} 
                                />
                              )}
                              <p className="text-xs font-medium text-foreground truncate">👤 {n.user_email}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              {new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                        
                        {/* Body */}
                        <div 
                          className={`px-3 space-y-1.5 border-border overflow-hidden transition-all duration-200 ${
                            isExpanded ? "max-h-[500px] pb-3 pt-2 border-t opacity-100 bg-muted/10" : "max-h-0 opacity-0"
                          }`}
                        >
                          {n.needs && (
                            <p className="text-xs text-foreground mt-1"><span className="font-semibold text-foreground/80">Necessidades:</span> {n.needs}</p>
                          )}
                          {n.notes && (
                            <div className="bg-muted/50 p-2.5 rounded-lg mt-1 border border-border/40">
                              <p className="text-xs text-muted-foreground italic">"{n.notes}"</p>
                            </div>
                          )}
                          {!n.needs && !n.notes && (
                            <p className="text-xs text-muted-foreground italic mt-1">Nenhuma observação ou necessidade detalhada.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManageLocations;

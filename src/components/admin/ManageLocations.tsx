import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, MapPinPlus, Pencil, Eye, Download, ExternalLink } from "lucide-react";
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
import * as XLSX from "xlsx";

interface MissionLocation {
  id: string;
  name: string;
  address: string;
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
}

const ManageLocations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [locations, setLocations] = useState<MissionLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("pendente");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // User notes viewing
  const [showNotes, setShowNotes] = useState(false);
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("mission_locations")
      .select("id, name, address, status, google_maps_url")
      .order("created_at", { ascending: false });
    if (data) setLocations(data as MissionLocation[]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  const resetForm = () => {
    setName(""); setAddress(""); setStatus("pendente"); setGoogleMapsUrl(""); setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      address: address.trim(),
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
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Local adicionado!" }); resetForm(); fetchLocations(); }
    }
    setSubmitting(false);
  };

  const handleEdit = (loc: MissionLocation) => {
    setEditingId(loc.id);
    setName(loc.name);
    setAddress(loc.address);
    setStatus(loc.status);
    setGoogleMapsUrl(loc.google_maps_url || "");
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

      const enriched: UserNote[] = (notes as any[]).map((n) => {
        const loc = locs?.find((l: any) => l.id === n.location_id);
        const profile = profiles?.find((p: any) => p.id === n.user_id);
        return {
          ...n,
          location_name: loc?.name || "—",
          location_address: loc?.address || "",
          user_email: profile?.full_name || profile?.email || n.user_id,
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
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Observações");
    XLSX.writeFile(wb, "observacoes_locais_missao.xlsx");
  };

  const statusColors: Record<string, string> = {
    pendente: "bg-amber-100 text-amber-700",
    visitado: "bg-green-100 text-green-700",
    "em andamento": "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <MapPinPlus size={18} /> {editingId ? "Editar Local" : "Novo Local de Missão"}
        </h3>
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
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColors[loc.status] || "bg-muted text-muted-foreground"}`}>
                {loc.status}
              </span>
              <div className="flex gap-1">
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

      {/* User notes dialog */}
      <Dialog open={showNotes} onOpenChange={setShowNotes}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Observações dos Missionários
              {userNotes.length > 0 && (
                <Button size="sm" variant="outline" onClick={exportUserNotes} className="gap-1">
                  <Download size={14} /> Exportar Excel
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingNotes ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : userNotes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma observação registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {userNotes.map((n) => (
                <div key={n.id} className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground">{n.location_name}</p>
                    <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">👤 {n.user_email}</p>
                  {n.needs && (
                    <p className="text-xs text-foreground"><span className="font-semibold">Necessidades:</span> {n.needs}</p>
                  )}
                  {n.notes && (
                    <p className="text-xs text-foreground italic">{n.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageLocations;

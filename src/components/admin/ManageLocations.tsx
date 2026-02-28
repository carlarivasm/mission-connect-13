import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, MapPinPlus, Pencil } from "lucide-react";

interface MissionLocation {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  needs: string | null;
  notes: string | null;
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
  const [needs, setNeeds] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("mission_locations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLocations(data);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  const resetForm = () => {
    setName(""); setAddress(""); setStatus("pendente"); setNeeds(""); setNotes(""); setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      address: address.trim(),
      status,
      needs: needs.trim() || null,
      notes: notes.trim() || null,
      created_by: user?.id,
    };

    if (editingId) {
      const { error } = await supabase.from("mission_locations").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Local atualizado!" }); resetForm(); fetchLocations(); }
    } else {
      const { error } = await supabase.from("mission_locations").insert(payload);
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
    setNeeds(loc.needs || "");
    setNotes(loc.notes || "");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("mission_locations").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchLocations();
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
            <Label>Necessidades</Label>
            <Textarea value={needs} onChange={(e) => setNeeds(e.target.value)} placeholder="Necessidades identificadas neste local" rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações adicionais" rows={2} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="gradient-mission text-primary-foreground">
            {submitting ? "Salvando..." : editingId ? "Atualizar" : "Adicionar Local"}
          </Button>
          {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
        </div>
      </form>

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
                {loc.needs && <p className="text-xs text-muted-foreground mt-0.5 truncate">📋 {loc.needs}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColors[loc.status] || "bg-muted text-muted-foreground"}`}>
                {loc.status}
              </span>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(loc)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(loc.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageLocations;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToExcel, exportToCsv } from "@/lib/excel";

interface NoteRow {
  location_name: string;
  location_address: string;
  user_name: string;
  user_email: string;
  house_number: string;
  resident_name: string;
  user_address: string;
  needs: string;
  notes: string;
  updated_at: string;
}

const ManageLocationNotes = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get all notes with location and user info
      const { data: notes } = await supabase
        .from("location_user_notes")
        .select("location_id, user_id, house_number, resident_name, needs, notes, user_address, updated_at")
        .order("updated_at", { ascending: false });

      if (!notes || notes.length === 0) { setLoading(false); return; }

      const locationIds = [...new Set((notes as any[]).map((n) => n.location_id))];
      const userIds = [...new Set((notes as any[]).map((n) => n.user_id))];

      const [{ data: locations }, { data: profiles }] = await Promise.all([
        supabase.from("mission_locations").select("id, name, address").in("id", locationIds),
        supabase.from("profiles").select("id, full_name, email").in("id", userIds),
      ]);

      const locMap: Record<string, { name: string; address: string }> = {};
      (locations || []).forEach((l: any) => { locMap[l.id] = { name: l.name, address: l.address }; });

      const userMap: Record<string, { name: string; email: string }> = {};
      (profiles || []).forEach((p: any) => { userMap[p.id] = { name: p.full_name, email: p.email }; });

      const mapped: NoteRow[] = (notes as any[]).map((n) => ({
        location_name: locMap[n.location_id]?.name || "",
        location_address: locMap[n.location_id]?.address || "",
        user_name: userMap[n.user_id]?.name || "",
        user_email: userMap[n.user_id]?.email || "",
        house_number: n.house_number || "",
        resident_name: n.resident_name || "",
        user_address: n.user_address || "",
        needs: n.needs || "",
        notes: n.notes || "",
        updated_at: n.updated_at,
      }));
      setRows(mapped);
      setLoading(false);
    };
    fetch();
  }, []);

  const exportData = (format: "csv" | "xlsx") => {
    const data = rows.map((r) => ({
      "Local": r.location_name,
      "Endereço do Local": r.location_address,
      "Missionário": r.user_name,
      "Email": r.user_email,
      "Nº Casa": r.house_number,
      "Morador": r.resident_name,
      "Complemento": r.user_address,
      "Necessidades": r.needs,
      "Observações": r.notes,
      "Atualizado em": new Date(r.updated_at).toLocaleDateString("pt-BR"),
    }));

    if (format === "csv") {
      exportToCsv(data, "observacoes-locais.csv");
    } else {
      exportToExcel(data, "Observações", "observacoes-locais.xlsx");
    }
    toast({ title: "Exportado!" });
  };

  if (loading) return <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">Observações dos Missionários</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportData("csv")} className="gap-1" disabled={rows.length === 0}>
            <Download size={14} /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportData("xlsx")} className="gap-1" disabled={rows.length === 0}>
            <Download size={14} /> Excel
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma observação registrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Local</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Missionário</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Nº Casa</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Morador</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Complemento</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Necessidades</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Observações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 px-2">
                    <p className="font-medium text-foreground">{r.location_name}</p>
                    <p className="text-xs text-muted-foreground">{r.location_address}</p>
                  </td>
                  <td className="py-2 px-2">
                    <p className="text-foreground">{r.user_name}</p>
                    <p className="text-xs text-muted-foreground">{r.user_email}</p>
                  </td>
                  <td className="py-2 px-2 text-foreground text-xs">{r.house_number || "—"}</td>
                  <td className="py-2 px-2 text-foreground text-xs">{r.resident_name || "—"}</td>
                  <td className="py-2 px-2 text-foreground text-xs">{r.user_address || "—"}</td>
                  <td className="py-2 px-2 text-foreground text-xs max-w-[150px] truncate">{r.needs || "—"}</td>
                  <td className="py-2 px-2 text-foreground text-xs max-w-[150px] truncate">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageLocationNotes;

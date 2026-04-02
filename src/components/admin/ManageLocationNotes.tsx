import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown } from "lucide-react";
import { exportToExcel, exportToCsv } from "@/lib/excel";
import { renderNeedsNames } from "@/lib/utils";
import { TEAM_COLOR_OPTIONS } from "./ManageOrgTeams";

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
  team_color: string | null;
  accepts_identification: boolean;
}

const ManageLocationNotes = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    const fetch = async () => {
      // Get all notes with location and user info
      const { data: notes } = await supabase
        .from("location_user_notes")
        .select("location_id, user_id, house_number, resident_name, needs, notes, user_address, updated_at, accepts_identification")
        .order("updated_at", { ascending: false });

      if (!notes || notes.length === 0) { setLoading(false); return; }

      const locationIds = [...new Set((notes as any[]).map((n) => n.location_id))];
      const userIds = [...new Set((notes as any[]).map((n) => n.user_id))];

      const [{ data: locations }, { data: profiles }, { data: categories }, { data: orgPositions }, { data: colorSettings }] = await Promise.all([
        supabase.from("mission_locations").select("id, name, address").in("id", locationIds),
        supabase.from("profiles").select("id, full_name, email").in("id", userIds),
        supabase.from("needs_categories").select("id, name"),
        supabase.from("org_positions").select("profile_id, function_name").in("profile_id", userIds).in("category", ["equipe", "responsavel_equipe"]),
        supabase.from("app_settings").select("setting_value").eq("setting_key", "org_team_colors").maybeSingle()
      ]);

      const locMap: Record<string, { name: string; address: string }> = {};
      (locations || []).forEach((l: any) => { locMap[l.id] = { name: l.name, address: l.address }; });

      const userMap: Record<string, { name: string; email: string }> = {};
      (profiles || []).forEach((p: any) => { userMap[p.id] = { name: p.full_name, email: p.email }; });

      const teamMap: Record<string, string> = {};
      (orgPositions || []).forEach((p: any) => {
        if (p.profile_id && p.function_name) teamMap[p.profile_id] = p.function_name;
      });

      let teamColors: Record<string, string> = {};
      if (colorSettings?.setting_value) {
        try { teamColors = JSON.parse(colorSettings.setting_value); } catch {}
      }

      const mapped: NoteRow[] = (notes as any[]).map((n) => ({
        location_name: locMap[n.location_id]?.name || "",
        location_address: locMap[n.location_id]?.address || "",
        user_name: userMap[n.user_id]?.name || "",
        user_email: teamMap[n.user_id] || "Sem equipe",
        house_number: n.house_number || "",
        resident_name: n.resident_name || "",
        user_address: n.user_address || "",
        needs: renderNeedsNames(n.needs, categories || []) || "",
        notes: n.notes || "",
        updated_at: n.updated_at,
        team_color: teamMap[n.user_id] ? teamColors[teamMap[n.user_id]] || null : null,
        accepts_identification: !!n.accepts_identification,
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
      "Aceita Identificação": r.accepts_identification ? "Sim" : "Não",
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
        <div className="space-y-3">
          {rows.map((r, i) => {
            const isExpanded = expandedNotes.has(i);
            const colorObj = r.team_color ? TEAM_COLOR_OPTIONS.find(c => c.value === r.team_color) : null;
            
            return (
              <div key={i} className="bg-card rounded-xl shadow-card overflow-hidden transition-all duration-200">
                {/* Card Header */}
                <button 
                  onClick={() => toggleExpand(i)}
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{r.user_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {colorObj && (
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                          style={{ backgroundColor: `hsl(${colorObj.hsl})` }} 
                        />
                      )}
                      <p className="text-xs text-muted-foreground truncate">{r.user_email}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(r.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                    <p className="font-medium text-sm text-primary truncate max-w-[140px]">{r.location_name}</p>
                    <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>
                
                {/* Card Body */}
                <div 
                  className={`px-3 space-y-2 border-border overflow-hidden transition-all duration-200 ${
                    isExpanded ? "max-h-[500px] pb-4 pt-3 border-t opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="text-xs space-y-1">
                    <p><span className="font-semibold text-foreground">Aceita ser identificado:</span> <span className={r.accepts_identification ? "text-green-600 font-semibold" : "text-muted-foreground"}>{r.accepts_identification ? "Sim" : "Não"}</span></p>
                    <p><span className="font-semibold text-foreground">Local:</span> <span className="text-muted-foreground">{r.location_address}</span></p>
                    {r.house_number && <p><span className="font-semibold text-foreground">Nº Casa:</span> <span className="text-muted-foreground">{r.house_number}</span></p>}
                    {r.resident_name && <p><span className="font-semibold text-foreground">Morador:</span> <span className="text-muted-foreground">{r.resident_name}</span></p>}
                    {r.user_address && <p><span className="font-semibold text-foreground">Complemento:</span> <span className="text-muted-foreground">{r.user_address}</span></p>}
                    {r.needs && <p><span className="font-semibold text-foreground">Necessidades:</span> <span className="text-muted-foreground">{r.needs}</span></p>}
                    
                    {r.notes && (
                      <div className="mt-2 bg-muted/80 p-2.5 rounded-lg border border-border/40">
                        <p className="text-muted-foreground italic">"{r.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageLocationNotes;

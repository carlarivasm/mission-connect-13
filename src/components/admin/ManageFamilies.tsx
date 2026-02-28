import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface FamilyRow {
  id: string;
  full_name: string;
  email: string;
  family_name: string | null;
  family_names: string[] | null;
  family_ages: string[] | null;
  family_members_count: number | null;
}

const ManageFamilies = () => {
  const { toast } = useToast();
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email, family_name, family_names, family_ages, family_members_count")
      .order("full_name")
      .then(({ data, error }) => {
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
        if (data) setFamilies(data as FamilyRow[]);
        setLoading(false);
      });
  }, []);

  const exportData = (format: "csv" | "xlsx") => {
    const rows: Record<string, string>[] = [];

    families.forEach((f) => {
      const names = (f as any).family_names ?? [];
      const ages = f.family_ages ?? [];
      const count = Math.max(names.length, ages.length, f.family_members_count ?? 0);

      if (count === 0) {
        rows.push({
          "Missionário": f.full_name,
          "Email": f.email,
          "Nome da Família": (f as any).family_name ?? "",
          "Membro": "",
          "Idade": "",
        });
      } else {
        for (let i = 0; i < count; i++) {
          rows.push({
            "Missionário": i === 0 ? f.full_name : "",
            "Email": i === 0 ? f.email : "",
            "Nome da Família": i === 0 ? ((f as any).family_name ?? "") : "",
            "Membro": names[i] ?? "",
            "Idade": ages[i] ?? "",
          });
        }
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Famílias");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, "familias.csv");
    } else {
      XLSX.writeFile(wb, "familias.xlsx");
    }

    toast({ title: "Exportado!", description: `Arquivo ${format.toUpperCase()} baixado.` });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">Dados das Famílias</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportData("csv")} className="gap-1">
            <Download size={14} /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportData("xlsx")} className="gap-1">
            <Download size={14} /> Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Missionário</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Família</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Membros</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {families.map((f) => {
              const names = (f as any).family_names ?? [];
              const ages = f.family_ages ?? [];
              return (
                <tr key={f.id} className="border-b border-border/50">
                  <td className="py-2 px-2">
                    <p className="font-medium text-foreground">{f.full_name}</p>
                    <p className="text-xs text-muted-foreground">{f.email}</p>
                  </td>
                  <td className="py-2 px-2 text-foreground">{(f as any).family_name || "—"}</td>
                  <td className="py-2 px-2">
                    {names.length > 0 ? (
                      <div className="space-y-0.5">
                        {names.map((n: string, i: number) => (
                          <p key={i} className="text-foreground">
                            {n}{ages[i] ? ` (${ages[i]})` : ""}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center text-foreground">{f.family_members_count ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageFamilies;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Eye } from "lucide-react";

type Period = "7d" | "30d";

interface PageStat {
  page: string;
  views: number;
  unique_users: number;
}

interface DetailStat {
  page_detail: string;
  views: number;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  materiais: "Materiais",
  loja: "Loja",
  calendario: "Calendário",
  mapa: "Mapa",
  galeria: "Galeria",
  pesquisas: "Pesquisas",
  organograma: "Organograma",
  familia: "Família",
};

const ManageAnalytics = () => {
  const [period, setPeriod] = useState<Period>("7d");
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [materialDetails, setMaterialDetails] = useState<DetailStat[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [dailyData, setDailyData] = useState<{ day: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const days = period === "7d" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    const { data: views } = await supabase
      .from("page_views")
      .select("page, page_detail, user_id, created_at")
      .gte("created_at", sinceISO);

    if (!views) {
      setLoading(false);
      return;
    }

    // Total
    setTotalViews(views.length);
    const uniqueUsers = new Set(views.map((v) => v.user_id).filter(Boolean));
    setTotalUsers(uniqueUsers.size);

    // Per page
    const pageMap = new Map<string, { views: number; users: Set<string> }>();
    for (const v of views) {
      const entry = pageMap.get(v.page) || { views: 0, users: new Set<string>() };
      entry.views++;
      if (v.user_id) entry.users.add(v.user_id);
      pageMap.set(v.page, entry);
    }
    const stats: PageStat[] = Array.from(pageMap.entries())
      .map(([page, d]) => ({ page, views: d.views, unique_users: d.users.size }))
      .sort((a, b) => b.views - a.views);
    setPageStats(stats);

    // Material details
    const matViews = views.filter((v) => v.page === "materiais" && v.page_detail);
    const detailMap = new Map<string, number>();
    for (const v of matViews) {
      detailMap.set(v.page_detail!, (detailMap.get(v.page_detail!) || 0) + 1);
    }
    setMaterialDetails(
      Array.from(detailMap.entries())
        .map(([page_detail, cnt]) => ({ page_detail, views: cnt }))
        .sort((a, b) => b.views - a.views)
    );

    // Daily chart
    const dayMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const v of views) {
      const day = v.created_at.slice(0, 10);
      if (dayMap.has(day)) dayMap.set(day, dayMap.get(day)! + 1);
    }
    const daily = Array.from(dayMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
    setDailyData(daily);

    setLoading(false);
  };

  const maxDaily = Math.max(...dailyData.map((d) => d.count), 1);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={period === "7d" ? "default" : "outline"}
          onClick={() => setPeriod("7d")}
        >
          7 dias
        </Button>
        <Button
          size="sm"
          variant={period === "30d" ? "default" : "outline"}
          onClick={() => setPeriod("30d")}
        >
          30 dias
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalViews}</p>
              <p className="text-xs text-muted-foreground">Acessos totais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Usuários únicos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Acessos por dia
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-end gap-1 h-32">
            {dailyData.map((d) => (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-[9px] text-muted-foreground">
                  {d.count > 0 ? d.count : ""}
                </span>
                <div
                  className="w-full bg-primary rounded-t transition-all"
                  style={{
                    height: `${Math.max((d.count / maxDaily) * 100, 2)}%`,
                    minHeight: "2px",
                  }}
                />
                <span className="text-[8px] text-muted-foreground">
                  {d.day.slice(8)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per page */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Acessos por página</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pageStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum dado ainda.
            </p>
          ) : (
            pageStats.map((s) => (
              <div
                key={s.page}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground font-medium">
                  {PAGE_LABELS[s.page] || s.page}
                </span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{s.views} views</span>
                  <span className="text-xs">({s.unique_users} usuários)</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Material categories */}
      {materialDetails.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Materiais por categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {materialDetails.map((d) => (
              <div
                key={d.page_detail}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground">{d.page_detail}</span>
                <span className="text-muted-foreground">{d.views} views</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageAnalytics;

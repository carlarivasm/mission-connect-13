import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const mockEvents: Record<string, { title: string; type: string }[]> = {
  "2026-03-05": [{ title: "Reunião de Planejamento", type: "reunião" }],
  "2026-03-08": [{ title: "Missão Bairro Esperança", type: "missão" }],
  "2026-03-12": [{ title: "Formação Missionária", type: "formação" }],
  "2026-03-15": [{ title: "Encontro de Jovens", type: "reunião" }],
  "2026-03-22": [{ title: "Missão Centro", type: "missão" }],
};

const Calendario = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const getDateKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const selectedDate = `${year}-03-08`;

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Calendário" />
      <main className="px-4 py-5 space-y-5">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft size={20} className="text-foreground" />
          </button>
          <h2 className="text-lg font-display font-bold text-foreground">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight size={20} className="text-foreground" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card rounded-2xl shadow-card p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-bold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = getDateKey(day);
              const hasEvent = mockEvents[key];
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              return (
                <button
                  key={day}
                  className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-sm transition-all ${
                    isToday
                      ? "gradient-mission text-primary-foreground font-bold"
                      : hasEvent
                      ? "bg-secondary/20 text-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {day}
                  {hasEvent && !isToday && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-secondary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events List */}
        <section>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Atividades do Mês</h3>
          <div className="space-y-2">
            {Object.entries(mockEvents).map(([date, events]) =>
              events.map((event, i) => (
                <div key={`${date}-${i}`} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
                  <div className="w-1 h-10 rounded-full gradient-gold" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{date.split("-").reverse().join("/")} • {event.type}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default Calendario;

import { ChevronLeft, ChevronRight, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { todayBrasilia, nowTimeBrasilia } from "@/lib/dateBrasilia";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTracking } from "@/hooks/usePageTracking";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  location: string | null;
  meeting_link: string | null;
}

const Calendario = () => {
  const navigate = useNavigate();
  const { signOut, approved, role } = useAuth();
  const isApproved = approved || role === "admin";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  usePageTracking("calendario");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const filterPastEvents = (data: EventData[]) => {
    const todayKey = todayBrasilia();
    const currentTime = nowTimeBrasilia();

    return data.filter((ev) => {
      if (ev.event_date > todayKey) return true;
      if (ev.event_date === todayKey) {
        if (!ev.event_time) return true;
        return ev.event_time.slice(0, 5) >= currentTime;
      }
      // Past dates: keep for calendar grid context, but filter in displayed list
      return true;
    });
  };

  useEffect(() => {
    const fetchEvents = () => {
      if (!isApproved) {
        supabase
          .from("events")
          .select("*")
          .gte("event_date", todayBrasilia())
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true })
          .limit(5)
          .then(({ data }) => {
            if (data) {
              setAllEvents(data);
              setFilteredEvents(filterPastEvents(data));
            }
          });
        return;
      }

      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${daysInMonth}`;

      supabase
        .from("events")
        .select("*")
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true })
        .then(({ data }) => {
          if (data) {
            setAllEvents(data);
            setFilteredEvents(filterPastEvents(data));
          }
        });
    };

    fetchEvents();
    const interval = setInterval(() => {
      setFilteredEvents(filterPastEvents(allEvents));
    }, 60000);
    return () => clearInterval(interval);
  }, [year, month, daysInMonth, isApproved]);

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const getDateKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const eventsForDay = (day: number) => allEvents.filter((e) => e.event_date === getDateKey(day));

  const filteredForDay = (day: number) => filteredEvents.filter((e) => e.event_date === getDateKey(day));

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const upcomingFiltered = filteredEvents.filter((e) => e.event_date >= todayStr);

  const displayedEvents = selectedDay
    ? filteredForDay(selectedDay)
    : upcomingFiltered;

  const handleLogout = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Calendário" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        {!isApproved && (
          <div className="animate-fade-in rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/30 p-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⏳ Acesso limitado</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Sua conta está pendente de aprovação. Você pode ver apenas as próximas atividades.
            </p>
          </div>
        )}

        {isApproved && (
          <>
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
                  const hasEvent = eventsForDay(day).length > 0;
                  const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                  const isSelected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                      className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-sm transition-all ${
                        isSelected
                          ? "ring-2 ring-primary bg-primary/10 font-bold text-primary"
                          : isToday
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
          </>
        )}

        {/* Events List */}
        <section>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {!isApproved
              ? "Próximas Atividades"
              : selectedDay
              ? `Atividades do dia ${selectedDay}`
              : "Atividades do Mês"}
          </h3>
          <div className="space-y-2">
            {displayedEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade neste período.</p>
            ) : (
              displayedEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                  className="w-full text-left p-3 bg-card rounded-xl shadow-card transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg gradient-mission text-primary-foreground shrink-0">
                      <span className="text-xs font-bold leading-none">{new Date(event.event_date + 'T00:00:00').getDate()}</span>
                      <span className="text-[10px] leading-none mt-0.5">{new Date(event.event_date + 'T00:00:00').toLocaleString('pt-BR', { month: 'short' })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.event_time?.slice(0, 5) || ""} • {event.event_type}
                        {event.location ? ` • ${event.location}` : ""}
                      </p>
                    </div>
                    {isApproved && (event.description || event.meeting_link) && (
                      <span className="shrink-0 text-muted-foreground">
                        {expandedEvent === event.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    )}
                  </div>
                  {isApproved && expandedEvent === event.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {event.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                      )}
                      {event.meeting_link && (
                        <a
                          href={event.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary flex items-center gap-1"
                        >
                          <Link2 size={10} /> Link da reunião
                        </a>
                      )}
                    </div>
                  )}
                </button>
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

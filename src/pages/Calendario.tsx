import { ChevronLeft, ChevronRight, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import EventCard, { EventData } from "@/components/events/EventCard";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const Calendario = () => {
  const navigate = useNavigate();
  const { signOut, approved, role } = useAuth();
  const isApproved = approved || role === "admin";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState("dia");
  usePageTracking("calendario");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Helper to check if an event is in the past
  const isEventPast = (ev: EventData) => {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const currentHMS = now.toTimeString().slice(0, 5);
    
    if (ev.event_date < todayISO) return true;
    if (ev.event_date === todayISO) {
      if (!ev.event_time) return false;
      return ev.event_time.slice(0, 5) < currentHMS;
    }
    return false;
  };

  const upcomingEventsFilter = (data: EventData[]) => data.filter((ev) => !isEventPast(ev));

  useEffect(() => {
    const fetchEvents = () => {
      if (!isApproved) {
        supabase
          .from("events")
          .select("*")
          .gte("event_date", new Date().toISOString().split("T")[0])
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true })
          .limit(10)
          .then(({ data }) => {
            if (data) setAllEvents(data);
          });
        return;
      }

      if (activeMainTab === "mes") {
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
            if (data) setAllEvents(data);
          });
      } else {
        supabase
          .from("events")
          .select("*")
          .gte("event_date", "2026-04-03")
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true })
          .then(({ data }) => {
            if (data) setAllEvents(data);
          });
      }
    };

    fetchEvents();
    // Refresh the list slightly to trigger re-renders if things just became past
    const interval = setInterval(() => {
      setAllEvents(prev => [...prev]);
    }, 60000);
    return () => clearInterval(interval);
  }, [year, month, daysInMonth, isApproved, activeMainTab]);

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const getDateKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const eventsForDay = (day: number) => allEvents.filter((e) => e.event_date === getDateKey(day));
  
  // For the Month view, we keep the original logic of filtering out past events from the list below the calendar
  const filteredEvents = upcomingEventsFilter(allEvents);
  const filteredForDay = (day: number) => filteredEvents.filter((e) => e.event_date === getDateKey(day));

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const upcomingFiltered = filteredEvents.filter((e) => e.event_date >= todayStr);

  const displayedEventsMonth = selectedDay
    ? filteredForDay(selectedDay)
    : upcomingFiltered;

  // Day tab event categories (we use allEvents because we want to see past events too)
  const events0304 = allEvents.filter((e) => e.event_date === "2026-04-03");
  const events0404 = allEvents.filter((e) => e.event_date === "2026-04-04");
  const events0504 = allEvents.filter((e) => e.event_date === "2026-04-05");
  const eventsPosMissoes = allEvents.filter((e) => e.event_date > "2026-04-05");

  const getTodayTab = () => {
    const todayISO = new Date().toISOString().split("T")[0];
    if (todayISO === "2026-04-04") return "04/04";
    if (todayISO === "2026-04-05") return "05/04";
    if (todayISO > "2026-04-05") return "pos";
    return "03/04"; // default
  };

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const renderDayEvents = (eventsData: EventData[], props: { showDate?: boolean } = {}) => {
    const past = eventsData.filter(isEventPast);
    const upcoming = eventsData.filter(e => !isEventPast(e));
  
    return (
      <div className="space-y-4">
        {past.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full px-3 py-2.5 bg-muted/30 rounded-xl group border border-border/50 shadow-sm">
              <span>Atividades Concluídas ({past.length})</span>
              <ChevronDown size={16} className="transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3 animate-fade-in pl-1">
              {past.map(event => <EventCard key={event.id} event={event} isPast={true} showDate={props.showDate} />)}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map(event => <EventCard key={event.id} event={event} showDate={props.showDate} />)}
          </div>
        ) : past.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade neste dia.</p>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">Todas as atividades deste bloco já foram concluídas.</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Calendário" onLogout={handleLogout} />
      <main className="px-4 py-5 space-y-5">
        {!isApproved && (
          <>
            <div className="animate-fade-in rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/30 p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⏳ Acesso limitado</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Sua conta está pendente de aprovação. Você pode ver apenas as próximas atividades.
              </p>
            </div>
            <section className="mt-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Próximas Atividades</h3>
              <div className="space-y-3">
                {displayedEventsMonth.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade neste período.</p>
                ) : (
                  displayedEventsMonth.map((event) => <EventCard key={event.id} event={event} />)
                )}
              </div>
            </section>
          </>
        )}

        {isApproved && (
          <Tabs defaultValue="dia" onValueChange={setActiveMainTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 rounded-xl p-1">
              <TabsTrigger value="dia" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Dia</TabsTrigger>
              <TabsTrigger value="mes" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Mês</TabsTrigger>
            </TabsList>
            
            <TabsContent value="mes" className="space-y-5 outline-none animate-fade-in">
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

              {/* Month Events List */}
              <section>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  {selectedDay ? `Atividades do dia ${selectedDay}` : "Atividades do Mês"}
                </h3>
                <div className="space-y-2">
                  {displayedEventsMonth.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">Nenhuma atividade neste período.</p>
                  ) : (
                    displayedEventsMonth.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                        className="w-full text-left p-3 bg-card rounded-xl shadow-card transition-colors hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg gradient-mission text-primary-foreground shrink-0">
                            <span className="text-xs font-bold leading-none">{new Date(`${event.event_date}T12:00:00Z`).toLocaleString('pt-BR', { timeZone: 'UTC', day: '2-digit' })}</span>
                            <span className="text-[10px] leading-none mt-0.5">{new Date(`${event.event_date}T12:00:00Z`).toLocaleString('pt-BR', { timeZone: 'UTC', month: 'short' })}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.event_time?.slice(0, 5) || ""} • {event.event_type}
                              {event.location ? ` • ${event.location}` : ""}
                            </p>
                          </div>
                          {(event.description || event.meeting_link) && (
                            <span className="shrink-0 text-muted-foreground">
                              {expandedEvent === event.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                          )}
                        </div>
                        {expandedEvent === event.id && (
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
            </TabsContent>

            <TabsContent value="dia" className="outline-none animate-fade-in mt-2 border-none">
              <Tabs defaultValue={getTodayTab()} className="w-full h-full">
                <TabsList className="flex w-full mb-4 bg-muted/30 rounded-xl p-1 justify-between gap-1 overflow-x-auto no-scrollbar">
                  <TabsTrigger value="03/04" className="flex-1 shrink-0 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-transparent min-w-0 px-2 flex flex-col">03/04</TabsTrigger>
                  <TabsTrigger value="04/04" className="flex-1 shrink-0 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-transparent min-w-0 px-2 flex flex-col">04/04</TabsTrigger>
                  <TabsTrigger value="05/04" className="flex-1 shrink-0 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-transparent min-w-0 px-2 flex flex-col">05/04</TabsTrigger>
                  <TabsTrigger value="pos" className="flex-[1.4] shrink-0 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-transparent min-w-0 px-2 whitespace-nowrap flex flex-col">Pós-Missões</TabsTrigger>
                </TabsList>
                
                <TabsContent value="03/04" className="space-y-3 outline-none">
                  {renderDayEvents(events0304)}
                </TabsContent>
                
                <TabsContent value="04/04" className="space-y-3 outline-none">
                  {renderDayEvents(events0404)}
                </TabsContent>
                
                <TabsContent value="05/04" className="space-y-3 outline-none">
                  {renderDayEvents(events0504)}
                </TabsContent>
                
                <TabsContent value="pos" className="space-y-3 outline-none">
                  {renderDayEvents(eventsPosMissoes, { showDate: true })}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Calendario;

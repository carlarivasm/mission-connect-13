import { Utensils, Users, BookOpen, Calendar as CalendarIcon, Info, Link2, Cross, PartyPopper } from "lucide-react";

export interface EventData {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  location?: string | null;
  meeting_link?: string | null;
}

interface EventCardProps {
  event: EventData;
  isPast?: boolean;
  showDate?: boolean;
}

export const getEventIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'refeição': return <Utensils size={20} />;
    case 'reunião': return <Users size={20} />;
    case 'formação': return <BookOpen size={20} />;
    case 'missão': return <Cross size={20} />;
    case 'evento': return <PartyPopper size={20} />;
    default: return <Info size={20} />;
  }
};

const EventCard = ({ event, isPast = false, showDate = false }: EventCardProps) => {
  return (
    <div className={`w-full text-left p-3.5 rounded-xl shadow-card transition-colors flex gap-4 ${isPast ? 'bg-muted/50 opacity-75' : 'bg-card'}`}>
      <div className="flex flex-col items-center justify-start shrink-0 space-y-1">
        <div className={`p-2 w-10 h-10 flex items-center justify-center rounded-full mt-1 ${isPast ? 'bg-slate-200 text-slate-500 dark:bg-slate-800' : 'bg-primary/10 text-primary'}`}>
          {getEventIcon(event.event_type)}
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 border-l border-border pl-4">
        <div className="flex justify-between items-start gap-2">
          <p className="font-semibold text-sm text-foreground leading-tight mt-0.5">{event.title}</p>
          <div className="flex items-center gap-1.5 text-right">
            {showDate && (
              <span className={`text-xs font-bold uppercase tracking-wider ${isPast ? 'text-muted-foreground' : 'text-primary/70'}`}>
                {new Date(`${event.event_date}T12:00:00Z`).toLocaleString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })}
              </span>
            )}
            <span className={`font-bold text-base whitespace-nowrap ${isPast ? 'text-muted-foreground' : 'text-primary'}`}>
              {event.event_time?.slice(0, 5) || "00:00"}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          {event.location ? ` ${event.location}` : ""}
        </p>
        {(event.description || event.meeting_link) && (
          <div className="mt-1 space-y-1">
            {event.description && (
              <p className="text-xs text-foreground/80 whitespace-pre-wrap">{event.description}</p>
            )}
            {event.meeting_link && (
              <a
                href={event.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`text-xs flex items-center gap-1 w-fit mt-1.5 ${isPast ? 'text-muted-foreground' : 'text-primary'}`}
              >
                <Link2 size={12} /> Link da reunião
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;

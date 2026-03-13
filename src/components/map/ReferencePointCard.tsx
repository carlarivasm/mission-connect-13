import { MapPin, Navigation, Pin, ArrowUp, ArrowDown } from "lucide-react";
import { MissionLocation } from "./LocationCard";

interface ReferencePointCardProps {
  loc: MissionLocation;
  isSelected: boolean;
  onSelect: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  canPinMore: boolean;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
}

export function ReferencePointCard({
  loc,
  isSelected,
  onSelect,
  isPinned,
  onTogglePin,
  canPinMore,
  onMoveUp,
  onMoveDown,
}: ReferencePointCardProps) {
  return (
    <div
      className={`p-4 bg-card rounded-xl shadow-card space-y-3 transition-all cursor-pointer ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isPinned ? "border-2 border-primary/40" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg gradient-mission text-primary-foreground mt-0.5 shrink-0">
          <MapPin size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-foreground truncate">{loc.name}</p>
            {isPinned && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                Fixado
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
        </div>

        {/* Reorder & Pin controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp || undefined}
            disabled={!onMoveUp}
            className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mover para cima"
          >
            <ArrowUp size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={onMoveDown || undefined}
            disabled={!onMoveDown}
            className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mover para baixo"
          >
            <ArrowDown size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={onTogglePin}
            disabled={!isPinned && !canPinMore}
            className={`p-1.5 rounded-md transition-colors ${
              isPinned
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : canPinMore
                ? "hover:bg-muted text-muted-foreground"
                : "opacity-30 cursor-not-allowed text-muted-foreground"
            }`}
            title={isPinned ? "Desfixar" : canPinMore ? "Fixar como principal" : "Máximo de 2 fixados"}
          >
            <Pin size={14} className={isPinned ? "fill-current" : ""} />
          </button>
        </div>
      </div>

      {loc.google_maps_url && (
        <div onClick={(e) => e.stopPropagation()}>
          <a
            href={loc.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-2 border-primary/20 bg-primary/10 text-primary font-semibold text-xs hover:bg-primary/20 transition-colors"
          >
            <Navigation size={14} /> Abrir no Maps
          </a>
        </div>
      )}
    </div>
  );
}

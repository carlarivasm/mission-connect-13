import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import OrgMemberCard from "./OrgMemberCard";
import type { OrgPosition, OrgProfile } from "@/pages/Organograma";

interface OrgCategorySectionProps {
  label: string;
  positions: OrgPosition[];
  profiles: Map<string, OrgProfile>;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  subcategoryLabels?: Record<string, string>;
}

const OrgCategorySection = ({ label, positions, profiles, icon, defaultOpen = false, subcategoryLabels }: OrgCategorySectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  if (positions.length === 0) return null;

  const grouped = new Map<string, OrgPosition[]>();
  const ungrouped: OrgPosition[] = [];

  if (subcategoryLabels) {
    Object.keys(subcategoryLabels).forEach(key => grouped.set(subcategoryLabels[key], []));
    positions.forEach(p => {
      const lbl = subcategoryLabels[p.category];
      if (lbl) grouped.get(lbl)!.push(p);
      else ungrouped.push(p);
    });
    grouped.forEach((v, k) => { if (v.length === 0) grouped.delete(k); });
  } else {
    positions.forEach(p => {
      const fn = p.function_name?.trim();
      if (fn) {
        if (!grouped.has(fn)) grouped.set(fn, []);
        grouped.get(fn)!.push(p);
      } else {
        ungrouped.push(p);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full text-left p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {icon || <Users size={18} className="text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-foreground">{label}</h2>
          <p className="text-xs text-muted-foreground">{positions.length} {positions.length === 1 ? "membro" : "membros"}</p>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "text-muted-foreground transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          open ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 space-y-4">
          {Array.from(grouped.entries()).map(([groupLabel, items]) => (
            <div key={groupLabel} className="space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
                {groupLabel}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map(p => (
                  <OrgMemberCard
                    key={p.id}
                    position={p}
                    profile={p.profile_id ? profiles.get(p.profile_id) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ungrouped.map(p => (
                <OrgMemberCard
                  key={p.id}
                  position={p}
                  profile={p.profile_id ? profiles.get(p.profile_id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgCategorySection;

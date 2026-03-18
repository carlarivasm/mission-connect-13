import { useState } from "react";
import { Phone, MessageCircle, Mail, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { OrgPosition, OrgProfile } from "@/pages/Organograma";

interface OrgMemberCardProps {
  position: OrgPosition;
  profile?: OrgProfile;
}

const formatWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${num}`;
};

const OrgMemberCard = ({ position, profile }: OrgMemberCardProps) => {
  const [open, setOpen] = useState(false);
  const name = profile?.full_name || position.title;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const showPhone = profile?.show_phone_in_org && profile?.phone;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200 text-left w-full min-w-[200px] max-w-[260px] shrink-0"
      >
        <Avatar className="h-10 w-10 rounded-full border-2 border-primary/20 shrink-0">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={name} className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold rounded-full">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          {position.function_name && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{position.function_name}</p>
          )}
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs p-0 overflow-hidden rounded-2xl">
          <div className="flex flex-col items-center p-6 space-y-4">
            <Avatar className="h-24 w-24 rounded-full border-4 border-primary/20">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={name} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold rounded-full">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-foreground">{name}</h3>
              {position.function_name && (
                <p className="text-sm text-muted-foreground">{position.function_name}</p>
              )}
            </div>

            {showPhone && (
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={`tel:${profile!.phone}`}
                  className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  title="Ligar"
                >
                  <Phone size={18} className="text-primary" />
                </a>
                <a
                  href={formatWhatsApp(profile!.phone!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 w-11 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle size={18} className="text-green-600" />
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrgMemberCard;

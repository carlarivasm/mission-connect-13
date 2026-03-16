import { Phone, MessageCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  const name = profile?.full_name || position.title;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const showPhone = profile?.show_phone_in_org && profile?.phone;

  return (
    <div className="flex items-center gap-3.5 p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
        {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={name} /> : null}
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        {position.function_name && (
          <p className="text-xs text-muted-foreground mt-0.5">{position.function_name}</p>
        )}
      </div>

      {showPhone && (
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`tel:${profile!.phone}`}
            className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
            title="Ligar"
          >
            <Phone size={14} className="text-primary" />
          </a>
          <a
            href={formatWhatsApp(profile!.phone!)}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle size={14} className="text-green-600" />
          </a>
        </div>
      )}
    </div>
  );
};

export default OrgMemberCard;

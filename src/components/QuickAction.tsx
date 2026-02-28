import { LucideIcon } from "lucide-react";

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: "primary" | "accent";
}

const QuickAction = ({ icon: Icon, label, onClick, variant = "primary" }: QuickActionProps) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl shadow-card transition-all duration-200 active:scale-95 ${
        variant === "accent"
          ? "bg-secondary/15 hover:bg-secondary/25 text-secondary-foreground"
          : "bg-card hover:bg-muted text-foreground"
      }`}
    >
      <div className={`p-3 rounded-full ${
        variant === "accent" ? "gradient-gold text-primary" : "gradient-mission text-primary-foreground"
      }`}>
        <Icon size={22} />
      </div>
      <span className="text-xs font-semibold text-center leading-tight">{label}</span>
    </button>
  );
};

export default QuickAction;

import { Palette } from "lucide-react";

export const colorPresets = [
  { label: "Azul Missão", primary: "220 60% 25%", secondary: "38 80% 55%" },
  { label: "Verde Esperança", primary: "150 50% 25%", secondary: "45 90% 55%" },
  { label: "Roxo Fé", primary: "270 50% 30%", secondary: "38 80% 55%" },
  { label: "Vermelho Caridade", primary: "0 60% 35%", secondary: "38 80% 55%" },
  { label: "Marrom Terra", primary: "30 40% 25%", secondary: "45 80% 55%" },
  { label: "Laranja Missão", primary: "25 80% 45%", secondary: "38 80% 55%" },
  { label: "Amarelo Luz", primary: "45 85% 45%", secondary: "220 60% 25%" },
  { label: "Vermelho Fogo", primary: "0 75% 45%", secondary: "45 90% 55%" },
];

interface ColorPaletteSelectorProps {
  primaryColor: string;
  secondaryColor: string;
  onChangeColors: (primary: string, secondary: string) => void;
  /** Compact mode shows only preset buttons (for dropdown menus) */
  compact?: boolean;
}

const ColorPaletteSelector = ({
  primaryColor,
  secondaryColor,
  onChangeColors,
  compact = false,
}: ColorPaletteSelectorProps) => {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {colorPresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChangeColors(preset.primary, preset.secondary)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              primaryColor === preset.primary
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
            title={preset.label}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: `hsl(${preset.primary})` }}
            />
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: `hsl(${preset.secondary})` }}
            />
            {preset.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette size={16} className="text-foreground" />
        <span className="text-sm font-medium text-foreground">Paleta de Cores</span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold">Presets</p>
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onChangeColors(preset.primary, preset.secondary)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                primaryColor === preset.primary
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span
                className="w-4 h-4 rounded-full"
                style={{ background: `hsl(${preset.primary})` }}
              />
              <span
                className="w-4 h-4 rounded-full"
                style={{ background: `hsl(${preset.secondary})` }}
              />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div
        className="mt-3 p-3 rounded-xl"
        style={{
          background: `linear-gradient(135deg, hsl(${primaryColor}), hsl(${primaryColor.split(" ")[0]} ${primaryColor.split(" ")[1]} 35%))`,
        }}
      >
        <p className="text-sm font-bold" style={{ color: `hsl(40 50% 95%)` }}>
          Preview do Header
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: `hsl(${secondaryColor})`,
              color: `hsl(${primaryColor})`,
            }}
          >
            Destaque
          </span>
        </div>
      </div>
    </div>
  );
};

export default ColorPaletteSelector;

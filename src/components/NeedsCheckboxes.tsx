import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

const NEEDS_OPTIONS = [
  "Batismo",
  "Confissão",
  "Crisma",
  "Casamento",
  "Catequese (1ª comunhão)",
  "Perseverança para Adolescente",
];

interface NeedsCheckboxesProps {
  value: string;
  onChange: (value: string) => void;
}

/** Parses a comma-separated needs string into { selected[], otherText } */
function parseNeeds(raw: string): { selected: string[]; otherText: string } {
  if (!raw) return { selected: [], otherText: "" };
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const selected: string[] = [];
  const others: string[] = [];
  for (const p of parts) {
    if (NEEDS_OPTIONS.includes(p)) {
      selected.push(p);
    } else {
      others.push(p);
    }
  }
  return { selected, otherText: others.join(", ") };
}

function serialize(selected: string[], otherText: string): string {
  const all = [...selected];
  if (otherText.trim()) all.push(otherText.trim());
  return all.join(", ");
}

const NeedsCheckboxes = ({ value, onChange }: NeedsCheckboxesProps) => {
  const parsed = parseNeeds(value);
  const [otherText, setOtherText] = useState(parsed.otherText);
  const hasOther = parsed.otherText.length > 0 || otherText.length > 0;
  const [showOther, setShowOther] = useState(hasOther);

  useEffect(() => {
    const p = parseNeeds(value);
    setOtherText(p.otherText);
    if (p.otherText) setShowOther(true);
  }, [value]);

  const toggle = (option: string, checked: boolean) => {
    const p = parseNeeds(value);
    const newSelected = checked
      ? [...p.selected, option]
      : p.selected.filter((s) => s !== option);
    onChange(serialize(newSelected, otherText));
  };

  const toggleOther = (checked: boolean) => {
    setShowOther(checked);
    if (!checked) {
      setOtherText("");
      const p = parseNeeds(value);
      onChange(serialize(p.selected, ""));
    }
  };

  const updateOther = (text: string) => {
    setOtherText(text);
    const p = parseNeeds(value);
    onChange(serialize(p.selected, text));
  };

  return (
    <div className="space-y-1.5">
      {NEEDS_OPTIONS.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={parsed.selected.includes(opt)}
            onCheckedChange={(checked) => toggle(opt, !!checked)}
          />
          <span className="text-xs text-foreground">{opt}</span>
        </label>
      ))}
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={showOther}
          onCheckedChange={(checked) => toggleOther(!!checked)}
        />
        <span className="text-xs text-foreground">Outros</span>
      </label>
      {showOther && (
        <Input
          value={otherText}
          onChange={(e) => updateOther(e.target.value)}
          placeholder="Especifique..."
          className="text-xs h-8 ml-6"
        />
      )}
    </div>
  );
};

export default NeedsCheckboxes;

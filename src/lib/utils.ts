import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function renderNeedsNames(needsStr: string | null | undefined, categories: any[]) {
  if (!needsStr) return "";
  try {
      const ids = JSON.parse(needsStr);
      if (!Array.isArray(ids)) return needsStr;
      const names = ids.map((id: string) => categories.find((c: any) => c.id === id)?.name).filter(Boolean);
      return names.join(", ");
  } catch {
      return needsStr;
  }
}


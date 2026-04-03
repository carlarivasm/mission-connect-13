import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Plus, Pencil, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { UserNote } from "./LocationCard";

interface NoteFormModalProps {
    open: boolean;
    onClose: () => void;
    /** If provided, we're editing an existing note. If null, we're creating a new one. */
    note: UserNote | null;
    /** The draft for a new note (used when note === null) */
    draft: UserNote;
    locId: string;
    locName: string;
    needsCategories: any[];
    savingId: string | null;
    /** Called when fields change for a NEW note */
    updateDraft: (locId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary" | "accepts_identification", value: string) => void;
    /** Called when fields change for an EXISTING note */
    updateExistingNote: (locId: string, noteId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary" | "accepts_identification", value: string) => void;
    /** Save new note */
    saveNewNote: (locId: string) => Promise<void>;
    /** Save existing note */
    saveExistingNote: (locId: string, noteId: string) => Promise<void>;
    /** Delete existing note */
    deleteNote: (locId: string, noteId: string) => Promise<void>;
}

export function NoteFormModal({
    open,
    onClose,
    note,
    draft,
    locId,
    locName,
    needsCategories,
    savingId,
    updateDraft,
    updateExistingNote,
    saveNewNote,
    saveExistingNote,
    deleteNote,
}: NoteFormModalProps) {
    const [summarizingId, setSummarizingId] = useState<string | null>(null);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    const isEditing = note !== null;
    const idToTrack = isEditing ? note!.id! : "new";

    const getValue = (field: keyof UserNote): string => {
        if (isEditing) return String(note![field] || "");
        return String((draft as any)[field] || "");
    };

    const handleChange = (field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary" | "accepts_identification", value: string) => {
        if (isEditing) {
            updateExistingNote(locId, note!.id!, field, value);
        } else {
            updateDraft(locId, field, value);
        }
    };

    const acceptsId = getValue("accepts_identification") === "true";

    const handleToggleAcceptsId = (checked: boolean) => {
        handleChange("accepts_identification", String(checked));
        if (!checked) {
            handleChange("resident_name", "");
            handleChange("house_number", "");
            handleChange("user_address", "");
            handleChange("exact_location_url", "");
        }
    };

    const handleSummarize = async () => {
        setSummarizingId(idToTrack);
        try {
            const noteData = isEditing ? note! : draft;
            let needsNames: string[] = [];
            try {
                const ids: string[] = JSON.parse(noteData.needs || "[]");
                needsNames = ids.map(id => {
                    const cat = needsCategories.find((c: any) => c.id === id);
                    return cat?.name || "";
                }).filter(Boolean);
            } catch { /* ignore */ }

            const { data, error } = await supabase.functions.invoke("summarize-note", {
                body: {
                    house_number: noteData.house_number,
                    resident_name: noteData.resident_name,
                    user_address: noteData.user_address,
                    needs_names: needsNames,
                    notes: noteData.notes,
                },
            });

            if (error) throw error;
            const summary = data?.summary || "Não foi possível gerar o resumo.";
            handleChange("summary", summary);
        } catch (err: any) {
            console.error("Erro ao resumir:", err);
            toast.error("Não foi possível gerar o resumo. Tente novamente.");
        } finally {
            setSummarizingId(null);
        }
    };

    const handleSave = async () => {
        if (isEditing) {
            await saveExistingNote(locId, note!.id!);
            onClose();
        } else {
            await saveNewNote(locId);
            onClose();
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        await deleteNote(locId, note!.id!);
        onClose();
    };

    const isSaving = isEditing ? savingId === note!.id : savingId === `new-${locId}`;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4"
            style={{ paddingTop: "68px", paddingBottom: "72px" }}
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" style={{ zIndex: -1 }} />

            {/* Panel sized to content, scrolls if taller than available space */}
            <div
                className="relative w-full bg-background shadow-2xl flex flex-col min-h-0 rounded-2xl"
                style={{ maxHeight: "calc(100dvh - 68px - 72px)" }}
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        {isEditing
                            ? <Pencil size={16} className="text-primary" />
                            : <Plus size={16} className="text-primary" />
                        }
                        <div>
                            <p className="text-sm font-bold text-foreground">
                                {isEditing ? "Editar observação" : "Nova observação"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{locName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable form body */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                    {/* Aceita ser identificado */}
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                        <Checkbox
                            id="accepts_identification"
                            checked={acceptsId}
                            onCheckedChange={(checked) => handleToggleAcceptsId(!!checked)}
                        />
                        <label htmlFor="accepts_identification" className="text-sm font-medium text-foreground cursor-pointer select-none">
                            Aceita ser identificado
                        </label>
                    </div>

                    {/* Nome do morador */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nome do morador</label>
                        <input
                            type="text"
                            value={acceptsId ? getValue("resident_name") : ""}
                            onChange={(e) => handleChange("resident_name", e.target.value)}
                            placeholder="Nome de quem mora na casa..."
                            disabled={!acceptsId}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted"
                        />
                    </div>

                    {/* Nº da casa */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nº da casa / identificação</label>
                        <input
                            type="text"
                            value={acceptsId ? getValue("house_number") : ""}
                            onChange={(e) => handleChange("house_number", e.target.value)}
                            placeholder="Ex: 123, 45A, S/N..."
                            disabled={!acceptsId}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted"
                        />
                    </div>

                    {/* Complemento */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Complemento</label>
                        <Textarea
                            value={acceptsId ? getValue("user_address") : ""}
                            onChange={(e) => handleChange("user_address", e.target.value)}
                            placeholder="Apt, bloco, referência..."
                            rows={1}
                            disabled={!acceptsId}
                            className="text-sm min-h-[36px] py-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted"
                        />
                    </div>

                    {/* Link exato */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Link do local exato (Maps)</label>
                        <input
                            type="url"
                            value={acceptsId ? getValue("exact_location_url") : ""}
                            onChange={(e) => handleChange("exact_location_url", e.target.value)}
                            placeholder="https://maps.google.com/..."
                            disabled={!acceptsId}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted"
                        />
                    </div>

                    {/* Necessidades */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Necessidades identificadas</label>
                        <NeedsMultiSelect
                            options={needsCategories}
                            value={getValue("needs")}
                            onChange={(val) => handleChange("needs", val)}
                        />
                    </div>

                    {/* Observações */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Observações</label>
                        <Textarea
                            value={getValue("notes")}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            placeholder="Anotações adicionais..."
                            rows={3}
                            className="text-sm"
                        />
                    </div>

                    {/* Resumo IA */}
                    <div className="space-y-1 relative">
                        <div className={`flex items-center ${isEditing || getValue("summary") || summarizingId === idToTrack ? "justify-between" : "justify-end"} mb-1`}>
                            {(isEditing || getValue("summary") || summarizingId === idToTrack) && (
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Resumo</label>
                            )}
                            <button
                                type="button"
                                onClick={handleSummarize}
                                disabled={summarizingId !== null}
                                className="relative p-[1px] rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all hover:scale-105 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-1 h-6 px-2 text-[10px] font-bold text-primary bg-background rounded-full hover:bg-muted/50 transition-colors">
                                    <Sparkles size={12} className="text-purple-500" /> Resumir com IA
                                </div>
                            </button>
                        </div>
                        {(isEditing || getValue("summary") || summarizingId === idToTrack) && (
                            <div className={`relative rounded-md overflow-hidden p-[1px] transition-all ${summarizingId === idToTrack ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" : "bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50"}`}>
                                <Textarea
                                    value={getValue("summary")}
                                    onChange={(e) => handleChange("summary", e.target.value)}
                                    placeholder="Resumo..."
                                    rows={3}
                                    className={`text-sm border-0 min-h-[48px] m-0 bg-background relative z-10 transition-opacity ${summarizingId === idToTrack ? "opacity-30" : "opacity-100"}`}
                                    disabled={summarizingId === idToTrack}
                                />
                                {summarizingId === idToTrack && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-md animate-in fade-in duration-300">
                                        <Sparkles className="text-purple-500 animate-spin mb-1" size={16} />
                                        <span className="text-[10px] font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent uppercase tracking-wider">
                                            Resumindo
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer actions */}
                <div className="px-5 py-4 border-t border-border/60 space-y-2">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full gap-1 shadow-sm"
                    >
                        {isSaving ? "Salvando..." : isEditing ? "Salvar alterações" : "Enviar"}
                    </Button>
                    {isEditing && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="w-full gap-1 shadow-sm"
                        >
                            Remover observação
                        </Button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── NeedsMultiSelect (copied from LocationCard, kept local to modal) ────────

function NeedsMultiSelect({ options, value, onChange }: { options: any[], value: string, onChange: (v: string) => void }) {
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
        try { return JSON.parse(value || "[]"); } catch { return value ? [value] : []; }
    });

    // Sync when value changes externally (e.g. when editing an existing note)
    useEffect(() => {
        try {
            const parsed = JSON.parse(value || "[]");
            setSelectedIds(Array.isArray(parsed) ? parsed : []);
        } catch {
            setSelectedIds(value ? [value] : []);
        }
    }, [value]);

    const updateSelection = (newIds: string[]) => {
        setSelectedIds(newIds);
        onChange(JSON.stringify(newIds));
    };

    const parents = options.filter(o => !o.parent_id);

    const toggleParent = (parentId: string) => {
        const children = options.filter(o => o.parent_id === parentId).map(o => o.id);
        const allChildrenSelected = children.length > 0 && children.every(c => selectedIds.includes(c));
        const parentSelected = selectedIds.includes(parentId);
        const newIds = new Set(selectedIds);
        if (parentSelected || allChildrenSelected) {
            newIds.delete(parentId);
            children.forEach(c => newIds.delete(c));
        } else {
            newIds.add(parentId);
            children.forEach(c => newIds.add(c));
        }
        updateSelection(Array.from(newIds));
    };

    const toggleChild = (childId: string, parentId: string) => {
        const newIds = new Set(selectedIds);
        if (newIds.has(childId)) {
            newIds.delete(childId);
            newIds.delete(parentId);
        } else {
            newIds.add(childId);
            const children = options.filter(o => o.parent_id === parentId).map(o => o.id);
            const allSibsNowSelected = children.every(c => newIds.has(c));
            if (allSibsNowSelected && children.length > 0) newIds.add(parentId);
        }
        updateSelection(Array.from(newIds));
    };

    return (
        <div className="space-y-2 border border-input rounded-md p-2 bg-background">
            {parents.length === 0 ? <p className="text-xs text-muted-foreground p-1">Nenhuma categoria cadastrada.</p> : null}
            {parents.map(p => {
                const children = options.filter(o => o.parent_id === p.id);
                const parentSelected = selectedIds.includes(p.id) || (children.length > 0 && children.every(c => selectedIds.includes(c)));
                return (
                    <div key={p.id} className="space-y-1">
                        <button type="button" onClick={() => toggleParent(p.id)} className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary transition-colors text-left">
                            {parentSelected ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} className="text-muted-foreground" />}
                            {p.name}
                        </button>
                        {children.length > 0 && (
                            <div className="pl-5 grid grid-cols-2 gap-1 gap-x-2">
                                {children.map(c => {
                                    const childSelected = selectedIds.includes(c.id);
                                    return (
                                        <button type="button" key={c.id} onClick={() => toggleChild(c.id, p.id)} className="flex items-start gap-1.5 text-[11px] hover:text-primary transition-colors text-left leading-tight py-0.5">
                                            <div className="mt-0.5 shrink-0">
                                                {childSelected ? <CheckSquare size={12} className="text-primary" /> : <Square size={12} className="text-muted-foreground" />}
                                            </div>
                                            <span className={childSelected ? "text-foreground" : "text-muted-foreground"}>{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

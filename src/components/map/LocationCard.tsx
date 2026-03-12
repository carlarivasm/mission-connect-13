import { useState } from "react";
import { MapPin, Navigation, ChevronDown, ChevronUp, Plus, FileText, Trash2, Pencil, X, Sparkles, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface MissionLocation {
    id: string;
    name: string;
    address: string;
    category: string;
    status: string;
    google_maps_url: string | null;
}

export interface UserNote {
    id?: string;
    location_id: string;
    house_number: string;
    resident_name: string;
    needs: string;
    notes: string;
    user_address: string;
    exact_location_url: string;
    summary: string;
    created_at?: string;
    user_id?: string;
    user_name?: string;
}

const statusColors: Record<string, string> = {
    visitado: "bg-green-100 text-green-700",
    pendente: "bg-amber-100 text-amber-700",
    "em andamento": "bg-blue-100 text-blue-700",
};

const statusLabels: Record<string, string> = {
    visitado: "Visitado",
    pendente: "Pendente",
    "em andamento": "Em andamento",
};

interface LocationCardProps {
    loc: MissionLocation;
    notes: UserNote[];
    isSelected: boolean;
    onSelect: () => void;
    draft: UserNote;
    updateDraft: (locId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary", value: string) => void;
    saveNewNote: (locId: string) => Promise<void>;
    updateExistingNote: (locId: string, noteId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary", value: string) => void;
    saveExistingNote: (locId: string, noteId: string) => Promise<void>;
    deleteNote: (locId: string, noteId: string) => Promise<void>;
    savingId: string | null;
    needsCategories: any[];
    userId: string;
    role: "admin" | "missionary" | null;
}

export function LocationCard({
    loc,
    notes,
    isSelected,
    onSelect,
    draft,
    updateDraft,
    saveNewNote,
    updateExistingNote,
    saveExistingNote,
    deleteNote,
    savingId,
    needsCategories = [],
    userId,
    role,
}: LocationCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [summarizingId, setSummarizingId] = useState<string | null>(null);

    const handleSummarize = async (isNew: boolean, noteId?: string) => {
        const idToTrack = isNew ? "new" : noteId!;
        setSummarizingId(idToTrack);

        try {
            const noteData = isNew ? draft : notes.find(n => n.id === noteId);
            if (!noteData) return;

            // Resolve needs IDs to names
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
            if (isNew) {
                updateDraft(loc.id, "summary", summary);
            } else if (noteId) {
                updateExistingNote(loc.id, noteId, "summary", summary);
            }
        } catch (err: any) {
            console.error("Erro ao resumir:", err);
            toast.error("Não foi possível gerar o resumo. Tente novamente.");
        } finally {
            setSummarizingId(null);
        }
    };

    const handleSaveNew = async () => {
        await saveNewNote(loc.id);
        setIsAddingNote(false);
        setIsExpanded(true);
    };

    const handleSaveExisting = async (noteId: string) => {
        await saveExistingNote(loc.id, noteId);
        setEditingNoteId(null);
    };

    return (
        <div
            className={`p-4 bg-card rounded-xl shadow-card space-y-3 transition-all cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""
                }`}
            onClick={onSelect}
        >
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg gradient-mission text-primary-foreground mt-0.5 shrink-0">
                    <MapPin size={16} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{loc.name}</p>
                        {loc.category === "mission_zone" && (
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[loc.status] || "bg-muted text-muted-foreground"
                                    }`}
                            >
                                {statusLabels[loc.status] || loc.status}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                </div>
            </div>

            <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                {loc.google_maps_url && (
                    <a
                        href={loc.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-2 border-primary/20 bg-primary/10 text-primary font-semibold text-xs hover:bg-primary/20 transition-colors"
                    >
                        <Navigation size={14} /> Abrir no Maps
                    </a>
                )}
                <Button
                    variant="outline"
                    className="flex-1 text-xs h-auto py-2 bg-background hover:bg-muted font-semibold text-primary/80 border-primary/20 hover:text-primary transition-colors"
                    onClick={() => {
                        setIsAddingNote(true);
                    }}
                >
                    <Plus size={14} className="mr-1" /> Adicionar observações
                </Button>
            </div>

            {(notes.length > 0 || isAddingNote) && (
                <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                    {notes.length > 0 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center gap-2 w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1"
                        >
                            <FileText size={14} /> Ver observações ({notes.length})
                            {isExpanded ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
                        </button>
                    )}

                    {isExpanded && notes.length > 0 && (
                        <div className="space-y-3 mt-3">
                            {notes.map((note) => {
                                const canEdit = role === "admin" || note.user_id === userId;
                                return (
                                    <div key={note.id} className="p-3 bg-muted/30 rounded-lg border border-border/60 relative shadow-sm">
                                        {(editingNoteId === note.id && canEdit) ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Editar observação</span>
                                                    <button
                                                        onClick={() => setEditingNoteId(null)}
                                                        className="text-muted-foreground hover:text-destructive bg-background rounded-md p-1 border shadow-sm"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nº da casa / identificação</label>
                                                    <input
                                                        type="text"
                                                        value={note.house_number || ""}
                                                        onChange={(e) => updateExistingNote(loc.id, note.id!, "house_number", e.target.value)}
                                                        placeholder="Ex: 123, 45A, S/N..."
                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nome do morador</label>
                                                    <input
                                                        type="text"
                                                        value={note.resident_name || ""}
                                                        onChange={(e) => updateExistingNote(loc.id, note.id!, "resident_name", e.target.value)}
                                                        placeholder="Nome de quem mora na casa..."
                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Complemento</label>
                                                    <Textarea
                                                        value={note.user_address || ""}
                                                        onChange={(e) => updateExistingNote(loc.id, note.id!, "user_address", e.target.value)}
                                                        placeholder="Apt, bloco, referência..."
                                                        rows={1}
                                                        className="text-xs min-h-[32px] py-2"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Link do local exato (Maps)</label>
                                                    <input
                                                        type="url"
                                                        value={note.exact_location_url || ""}
                                                        onChange={(e) => updateExistingNote(loc.id, note.id!, "exact_location_url", e.target.value)}
                                                        placeholder="https://maps.google.com/..."
                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Necessidades</label>
                                                    <NeedsMultiSelect
                                                        options={needsCategories}
                                                        value={note.needs}
                                                        onChange={(val) => updateExistingNote(loc.id, note.id!, "needs", val)}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Observações</label>
                                                    <Textarea
                                                        value={note.notes}
                                                        onChange={(e) => updateExistingNote(loc.id, note.id!, "notes", e.target.value)}
                                                        placeholder="Anotações adicionais..."
                                                        rows={2}
                                                        className="text-xs"
                                                    />
                                                </div>
                                            <div className="space-y-1 relative">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Resumo</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSummarize(false, note.id)}
                                                        className="relative p-[1px] rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all hover:scale-105 shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-1 h-6 px-2 text-[10px] font-bold text-primary bg-background rounded-full hover:bg-muted/50 transition-colors">
                                                            <Sparkles size={12} className="text-purple-500" /> Resumir com IA
                                                        </div>
                                                    </button>
                                                </div>
                                                <div className={`relative rounded-md overflow-hidden p-[1px] transition-all ${summarizingId === note.id ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" : "bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50"}`}>
                                                    <Textarea
                                                        value={note.summary || ""}
                                                        onChange={(e) => updateExistingNote(loc.id, note.id!, "summary", e.target.value)}
                                                        placeholder="Resumo..."
                                                        rows={2}
                                                        className={`text-xs border-0 min-h-[48px] m-0 bg-background relative z-10 transition-opacity ${summarizingId === note.id ? "opacity-30" : "opacity-100"}`}
                                                        disabled={summarizingId === note.id}
                                                    />
                                                    {summarizingId === note.id && (
                                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-md animate-in fade-in duration-300">
                                                            <Sparkles className="text-purple-500 mb-1" size={16} />
                                                            <span className="text-[10px] font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent uppercase tracking-wider">
                                                                Resumindo
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveExisting(note.id!)}
                                                        disabled={savingId === note.id}
                                                        className="gap-1 flex-1 shadow-sm"
                                                    >
                                                        {savingId === note.id ? "Salvando..." : "Salvar"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => deleteNote(loc.id, note.id!)}
                                                        disabled={savingId === note.id}
                                                        className="gap-1 flex-1 shadow-sm"
                                                    >
                                                        <Trash2 size={12} /> Remover
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="pr-8">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => setEditingNoteId(note.id!)}
                                                        className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-primary bg-background rounded-md border shadow-sm transition-colors"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                )}
                                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                                    <div className="mb-2 pb-2 border-b border-border/50">
                                                        <span className="font-semibold text-primary">{note.user_name || "Usuário"}</span>
                                                        {note.created_at && (
                                                            <span className="text-[10px] ml-2 text-muted-foreground">
                                                                {new Date(note.created_at).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {note.house_number && (
                                                        <p>
                                                            <span className="font-semibold text-foreground/80">Nº Casa:</span> <span className="text-foreground">{note.house_number}</span>
                                                        </p>
                                                    )}
                                                    {note.resident_name && (
                                                        <p>
                                                            <span className="font-semibold text-foreground/80">Morador:</span> <span className="text-foreground">{note.resident_name}</span>
                                                        </p>
                                                    )}
                                                    {note.user_address && (
                                                        <p>
                                                            <span className="font-semibold text-foreground/80">Complemento:</span> <span className="text-foreground">{note.user_address}</span>
                                                        </p>
                                                    )}
                                                    {note.exact_location_url && (
                                                        <p>
                                                            <span className="font-semibold text-foreground/80">Link Exato:</span>{" "}
                                                            <a href={note.exact_location_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                                Abrir Maps
                                                            </a>
                                                        </p>
                                                    )}
                                                    {note.needs && (
                                                        <p>
                                                            <span className="font-semibold text-foreground/80">Necessidades:</span> <span className="text-foreground">{renderNeedsNames(note.needs, needsCategories)}</span>
                                                        </p>
                                                    )}
                                                    {note.notes && (
                                                        <p>
                                                            <span className="font-semibold text-foreground/80">Observações:</span> <span className="text-foreground">{note.notes}</span>
                                                        </p>
                                                    )}
                                                    {/* Funcionalidade de Resumo com IA temporariamente desativada
                                                note.summary && (
                                                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 border border-purple-100 mt-2">
                                                        <p className="font-semibold text-purple-900/80 mb-0.5 flex items-center gap-1">
                                                            <Sparkles size={10} /> Resumo IA:
                                                        </p>
                                                        <p className="text-foreground">{note.summary}</p>
                                                    </div>
                                                )
                                                */}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {isAddingNote && (
                        <div className="p-3 bg-primary/5 rounded-lg space-y-3 border-2 border-dashed border-primary/30 mt-3 relative shadow-inner">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-wide">
                                    <Plus size={14} /> Nova observação
                                </p>
                                <button
                                    onClick={() => setIsAddingNote(false)}
                                    className="text-muted-foreground hover:text-destructive bg-background rounded-md p-1 border shadow-sm"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nº da casa / identificação</label>
                                <input
                                    type="text"
                                    value={draft.house_number || ""}
                                    onChange={(e) => updateDraft(loc.id, "house_number", e.target.value)}
                                    placeholder="Ex: 123, 45A, S/N..."
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nome do morador</label>
                                <input
                                    type="text"
                                    value={draft.resident_name || ""}
                                    onChange={(e) => updateDraft(loc.id, "resident_name", e.target.value)}
                                    placeholder="Nome de quem mora na casa..."
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Complemento</label>
                                <Textarea
                                    value={draft.user_address || ""}
                                    onChange={(e) => updateDraft(loc.id, "user_address", e.target.value)}
                                    placeholder="Apt, bloco, referência..."
                                    rows={1}
                                    className="text-xs min-h-[32px] py-2"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Link do local exato (Maps)</label>
                                <input
                                    type="url"
                                    value={draft.exact_location_url || ""}
                                    onChange={(e) => updateDraft(loc.id, "exact_location_url", e.target.value)}
                                    placeholder="https://maps.google.com/..."
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Necessidades identificadas</label>
                                <NeedsMultiSelect
                                    options={needsCategories}
                                    value={draft.needs}
                                    onChange={(val) => updateDraft(loc.id, "needs", val)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Observações</label>
                                <Textarea
                                    value={draft.notes}
                                    onChange={(e) => updateDraft(loc.id, "notes", e.target.value)}
                                    placeholder="Anotações adicionais..."
                                    rows={2}
                                    className="text-xs"
                                />
                            </div>
                            {/* Funcionalidade de Resumo com IA temporariamente desativada
                            <div className="space-y-1 relative">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Resumo</label>
                                    <button
                                        type="button"
                                        onClick={() => handleSummarize(true)}
                                        className="relative p-[1px] rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all hover:scale-105 shadow-sm"
                                    >
                                        <div className="flex items-center gap-1 h-6 px-2 text-[10px] font-bold text-primary bg-background rounded-full hover:bg-muted/50 transition-colors">
                                            <Sparkles size={12} className="text-purple-500" /> Resumir com IA
                                        </div>
                                    </button>
                                </div>
                                <div className={`relative rounded-md overflow-hidden p-[1px] transition-all ${summarizingId === "new" ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" : "bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50"}`}>
                                    <Textarea
                                        value={draft.summary || ""}
                                        onChange={(e) => updateDraft(loc.id, "summary", e.target.value)}
                                        placeholder="Resumo..."
                                        rows={2}
                                        className={`text-xs border-0 min-h-[48px] m-0 bg-background relative z-10 transition-opacity ${summarizingId === "new" ? "opacity-30" : "opacity-100"}`}
                                        disabled={summarizingId === "new"}
                                    />
                                    {summarizingId === "new" && (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-md animate-in fade-in duration-300">
                                            <Sparkles className="text-purple-500 animate-spin mb-1" size={16} />
                                            <span className="text-[10px] font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent uppercase tracking-wider">
                                                Resumindo
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            */}
                            <Button
                                size="sm"
                                onClick={handleSaveNew}
                                disabled={savingId === `new-${loc.id}`}
                                className="w-full gap-1 shadow-sm mt-2"
                            >
                                {savingId === `new-${loc.id}` ? "Enviando..." : "Enviar"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function NeedsMultiSelect({ options, value, onChange }: { options: any[], value: string, onChange: (v: string) => void }) {
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(value || "[]");
        } catch {
            return value ? [value] : [];
        }
    });

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
            if (allSibsNowSelected && children.length > 0) {
                newIds.add(parentId);
            }
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

function renderNeedsNames(needsStr: string, categories: any[]) {
    try {
        const ids = JSON.parse(needsStr || "[]");
        if (!Array.isArray(ids)) return needsStr;
        const names = ids.map((id: string) => categories.find(c => c.id === id)?.name).filter(Boolean);
        return names.join(", ");
    } catch {
        return needsStr;
    }
}

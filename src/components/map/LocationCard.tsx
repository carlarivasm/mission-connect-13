import { useState } from "react";
import { MapPin, Navigation, ChevronDown, ChevronUp, Plus, FileText, Trash2, Pencil, X } from "lucide-react";
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
    created_at?: string;
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
    updateDraft: (locId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address", value: string) => void;
    saveNewNote: (locId: string) => Promise<void>;
    updateExistingNote: (locId: string, noteId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address", value: string) => void;
    saveExistingNote: (locId: string, noteId: string) => Promise<void>;
    deleteNote: (locId: string, noteId: string) => Promise<void>;
    savingId: string | null;
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
}: LocationCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

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
                            {notes.map((note) => (
                                <div key={note.id} className="p-3 bg-muted/30 rounded-lg border border-border/60 relative shadow-sm">
                                    {editingNoteId === note.id ? (
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
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Necessidades</label>
                                                <Textarea
                                                    value={note.needs}
                                                    onChange={(e) => updateExistingNote(loc.id, note.id!, "needs", e.target.value)}
                                                    placeholder="Descreva as necessidades..."
                                                    rows={2}
                                                    className="text-xs"
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
                                            <button
                                                onClick={() => setEditingNoteId(note.id!)}
                                                className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-primary bg-background rounded-md border shadow-sm transition-colors"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <div className="space-y-1.5 text-xs text-muted-foreground">
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
                                                {note.needs && (
                                                    <p>
                                                        <span className="font-semibold text-foreground/80">Necessidades:</span> <span className="text-foreground">{note.needs}</span>
                                                    </p>
                                                )}
                                                {note.notes && (
                                                    <p>
                                                        <span className="font-semibold text-foreground/80">Observações:</span> <span className="text-foreground">{note.notes}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
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
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Necessidades identificadas</label>
                                <Textarea
                                    value={draft.needs}
                                    onChange={(e) => updateDraft(loc.id, "needs", e.target.value)}
                                    placeholder="Descreva as necessidades..."
                                    rows={2}
                                    className="text-xs"
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

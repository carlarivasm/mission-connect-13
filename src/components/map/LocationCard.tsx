import { useState } from "react";
import { MapPin, Navigation, ChevronDown, ChevronUp, Plus, FileText, Pencil, Sparkles, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteFormModal } from "./NoteFormModal";
import { renderNeedsNames } from "@/lib/utils";

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
    accepts_identification: boolean;
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
    updateDraft: (locId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary" | "accepts_identification", value: string) => void;
    saveNewNote: (locId: string) => Promise<void>;
    updateExistingNote: (locId: string, noteId: string, field: "house_number" | "resident_name" | "needs" | "notes" | "user_address" | "exact_location_url" | "summary" | "accepts_identification", value: string) => void;
    saveExistingNote: (locId: string, noteId: string) => Promise<void>;
    deleteNote: (locId: string, noteId: string) => Promise<void>;
    savingId: string | null;
    needsCategories: any[];
    userId: string;
    role: "admin" | "missionary" | null;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
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
    isPinned = false,
    onTogglePin,
    canPinMore = true,
    onMoveUp,
    onMoveDown,
}: LocationCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    /** null = creating new note; UserNote = editing that note */
    const [editingNote, setEditingNote] = useState<UserNote | null>(null);

    const openCreateModal = () => {
        setEditingNote(null);
        setModalOpen(true);
    };

    const openEditModal = (note: UserNote) => {
        setEditingNote(note);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingNote(null);
        // Auto-expand after saving so user sees their note
        setIsExpanded(true);
    };

    return (
        <>
            <div
                className={`p-4 bg-card rounded-xl shadow-card space-y-3 transition-all cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""} ${isPinned ? "border-2 border-primary/40" : ""}`}
                onClick={onSelect}
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg gradient-mission text-primary-foreground mt-0.5 shrink-0">
                        <MapPin size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-foreground truncate">{loc.name}</p>
                            {isPinned && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                    Fixado
                                </span>
                            )}
                            {loc.category === "mission_zone" && (
                                <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[loc.status] || "bg-muted text-muted-foreground"}`}
                                >
                                    {statusLabels[loc.status] || loc.status}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                    </div>

                    {/* Reorder & Pin controls */}
                    {onTogglePin && (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={onMoveUp || undefined}
                                disabled={!onMoveUp}
                                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Mover para cima"
                            >
                                <ArrowUp size={14} className="text-muted-foreground" />
                            </button>
                            <button
                                onClick={onMoveDown || undefined}
                                disabled={!onMoveDown}
                                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Mover para baixo"
                            >
                                <ArrowDown size={14} className="text-muted-foreground" />
                            </button>
                            <button
                                onClick={onTogglePin}
                                disabled={!isPinned && !canPinMore}
                                className={`p-1.5 rounded-md transition-colors ${
                                    isPinned
                                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                                        : canPinMore
                                        ? "hover:bg-muted text-muted-foreground"
                                        : "opacity-30 cursor-not-allowed text-muted-foreground"
                                }`}
                                title={isPinned ? "Desfixar" : canPinMore ? "Fixar como principal" : "Máximo de 2 fixados"}
                            >
                                <Pin size={14} className={isPinned ? "fill-current" : ""} />
                            </button>
                        </div>
                    )}
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
                        onClick={openCreateModal}
                    >
                        <Plus size={14} className="mr-1" /> Adicionar Censo
                    </Button>
                </div>

                {notes.length > 0 && (
                    <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center gap-2 w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1"
                        >
                            <FileText size={14} /> Ver observações ({notes.length})
                            {isExpanded ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
                        </button>

                        {isExpanded && (
                            <div className="space-y-3 mt-3">
                                {notes.map((note) => {
                                    const isOwn = note.user_id === userId;
                                    const canEdit = role === "admin" || isOwn;

                                    return (
                                        <div key={note.id} className="p-3 bg-muted/30 rounded-lg border border-border/60 relative shadow-sm">
                                            {/* Author header */}
                                            <div className="mb-2 pb-2 border-b border-border/50 flex items-center justify-between">
                                                <div>
                                                    <span className="font-semibold text-xs text-primary">
                                                        {isOwn ? "Você" : (note.user_name || "Usuário")}
                                                    </span>
                                                    {note.created_at && (
                                                        <span className="text-[10px] ml-2 text-muted-foreground">
                                                            {new Date(note.created_at).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    )}
                                                </div>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openEditModal(note)}
                                                        className="p-1.5 text-muted-foreground hover:text-primary bg-background rounded-md border shadow-sm transition-colors"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            {isOwn ? (
                                                /* ── Own note: show full details ── */
                                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                                    {note.house_number && (
                                                        <p><span className="font-semibold text-foreground/80">Nº Casa:</span> <span className="text-foreground">{note.house_number}</span></p>
                                                    )}
                                                    {note.resident_name && (
                                                        <p><span className="font-semibold text-foreground/80">Morador:</span> <span className="text-foreground">{note.resident_name}</span></p>
                                                    )}
                                                    {note.user_address && (
                                                        <p><span className="font-semibold text-foreground/80">Complemento:</span> <span className="text-foreground">{note.user_address}</span></p>
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
                                                        <p><span className="font-semibold text-foreground/80">Necessidades:</span> <span className="text-foreground">{renderNeedsNames(note.needs, needsCategories)}</span></p>
                                                    )}
                                                    {note.notes && (
                                                        <p><span className="font-semibold text-foreground/80">Observações:</span> <span className="text-foreground">{note.notes}</span></p>
                                                    )}
                                                    {note.summary && (
                                                        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 border border-purple-100 mt-2">
                                                            <p className="font-semibold text-purple-900/80 mb-0.5 flex items-center gap-1">
                                                                <Sparkles size={10} /> Resumo IA:
                                                            </p>
                                                            <p className="text-foreground">{note.summary}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* ── Other user's note: show only AI summary ── */
                                                note.summary ? (
                                                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 border border-purple-100">
                                                        <p className="font-semibold text-purple-900/80 mb-0.5 flex items-center gap-1 text-xs">
                                                            <Sparkles size={10} /> Resumo da IA:
                                                        </p>
                                                        <p className="text-xs text-foreground">{note.summary}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">
                                                        Observação sem resumo.
                                                    </p>
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal for create / edit */}
            <NoteFormModal
                open={modalOpen}
                onClose={closeModal}
                note={editingNote}
                draft={draft}
                locId={loc.id}
                locName={loc.name}
                needsCategories={needsCategories}
                savingId={savingId}
                updateDraft={updateDraft}
                updateExistingNote={updateExistingNote}
                saveNewNote={saveNewNote}
                saveExistingNote={saveExistingNote}
                deleteNote={deleteNote}
            />
        </>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────





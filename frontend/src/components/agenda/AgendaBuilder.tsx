"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Clock, Trash2, ChevronDown, ChevronUp, Loader2, Timer, ListChecks } from "lucide-react";
import { agendaApi } from "@/lib/api";
import type { AgendaItem } from "@/lib/types";
import { cn, AGENDA_STATUS_STYLES } from "@/lib/utils";
import { toast } from "sonner";

interface AgendaBuilderProps {
  meetingId: string;
  scheduledDurationMinutes?: number;
  isLocked?: boolean;
}

export function AgendaBuilder({ meetingId, scheduledDurationMinutes, isLocked = false }: AgendaBuilderProps) {
  const [addingItem, setAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(15);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data, isLoading, mutate } = useSWR(
    ["agenda", meetingId],
    () => agendaApi.list(meetingId)
  );
  const items: AgendaItem[] = useMemo(() => data?.items ?? [], [data?.items]);
  const totalMinutes = items.reduce((s, i) => s + i.duration_minutes, 0);
  const isOverboxed = Boolean(scheduledDurationMinutes && totalMinutes > scheduledDurationMinutes);
  const overboxedMinutes = isOverboxed && scheduledDurationMinutes ? totalMinutes - scheduledDurationMinutes : 0;

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (isLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    // Optimistic update
    mutate({ total: reordered.length, items: reordered }, false);

    try {
      await agendaApi.reorder(meetingId, reordered.map((i) => i.id));
      mutate();
    } catch {
      mutate(); // revert
      toast.error("Failed to save order");
    }
  }, [items, meetingId, mutate, isLocked]);

  const handleAddItem = async () => {
    if (!newTitle.trim() || isLocked) return;
    setSaving(true);
    try {
      await agendaApi.create({
        meeting_id: meetingId,
        title: newTitle.trim(),
        duration_minutes: newDuration || 15,
        order_index: items.length,
      });
      setNewTitle("");
      setNewDuration(15);
      setAddingItem(false);
      mutate();
      toast.success("Agenda item added");
    } catch {
      toast.error("Failed to add agenda item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isLocked) return;
    try {
      await agendaApi.delete(id);
      mutate();
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  return (
    <div className="h-full overflow-y-auto max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Meeting Agenda</h2>
            {isLocked && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30">
                MoM Locked
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isLocked ? "Agenda is read-only after MoM approval." : "Drag items to prioritize · Click status to progress"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs",
              isOverboxed
                ? "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
                : "bg-[#E8F7F0] border-[#249E5E]/20 text-[#177042]"
            )}
          >
            <Timer className="w-4 h-4 stroke-[1.75]" />
            <span>
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m allocated
              {scheduledDurationMinutes ? ` / ${Math.floor(scheduledDurationMinutes / 60)}h ${scheduledDurationMinutes % 60}m` : ""}
            </span>
          </div>
          {!isLocked && (
            <button
              id="add-agenda-item-btn"
              onClick={() => setAddingItem(true)}
              className="btn-dsm-primary flex items-center gap-1.5 text-xs px-3.5 shadow-sm"
              aria-label="Add Topic"
            >
              <Plus className="w-4 h-4 stroke-[2]" /> Add Topic
            </button>
          )}
        </div>
      </div>

      {/* Overboxed warning banner (PRD FR-05) */}
      {isOverboxed && (
        <div className="flex items-center gap-2.5 p-3.5 mb-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs shadow-xs">
          <Clock className="w-4 h-4 text-[#D97706] flex-shrink-0" strokeWidth={1.75} />
          <div>
            <span className="font-bold">Overboxed Agenda: </span>
            <span>
              Total topic duration ({totalMinutes}m) exceeds the scheduled meeting duration ({scheduledDurationMinutes}m) by {overboxedMinutes}m. Adjust item durations or meeting length.
            </span>
          </div>
        </div>
      )}

      {/* Add item inline form */}
      {addingItem && (
        <div className="mb-4 p-4 rounded-xl bg-white border border-[#249E5E]/30 shadow-sm fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              id="new-agenda-title-input"
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder="Topic or discussion point…"
              className="input-dsm flex-1"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <Clock className="w-4 h-4 text-gray-400 stroke-[1.5]" />
              <input
                id="new-agenda-duration-input"
                type="number"
                min={1}
                max={480}
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="input-dsm w-20 text-center"
              />
              <span className="text-xs text-gray-500 font-medium">min</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="save-agenda-item-btn"
                onClick={handleAddItem}
                disabled={saving}
                className="btn-dsm-primary"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
              <button
                onClick={() => setAddingItem(false)}
                className="btn-dsm-neutral"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sortable list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-200 rounded-xl p-8">
          <div className="w-12 h-12 rounded-xl bg-[#E8F7F0] border border-[#249E5E]/20 flex items-center justify-center mb-3">
            <ListChecks className="w-6 h-6 text-[#249E5E] stroke-[1.5]" />
          </div>
          <h3 className="text-gray-900 font-bold text-sm">No agenda topics defined</h3>
          <p className="text-gray-500 text-xs mt-1 max-w-xs">
            Build structured discussions by adding timeboxed topics to your meeting agenda.
          </p>
          <button
            onClick={() => setAddingItem(true)}
            className="btn-dsm-secondary mt-4 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[1.5]" /> Add First Topic
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableAgendaItem
                  key={item.id}
                  item={item}
                  index={index}
                  isLocked={isLocked}
                  onDelete={() => handleDelete(item.id)}
                  onUpdate={() => mutate()}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ── Sortable item component ────────────────────────────────────────────────────
function SortableAgendaItem({
  item, index, isLocked = false, onDelete, onUpdate,
}: { item: AgendaItem; index: number; isLocked?: boolean; onDelete: () => void; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : "auto",
  };

  const statusStyle = AGENDA_STATUS_STYLES[item.status] ?? "";

  const cycleStatus = async () => {
    if (isLocked) return;
    const order: AgendaItem["status"][] = ["pending", "in_progress", "completed", "skipped"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    try {
      await agendaApi.update(item.id, { status: next });
      onUpdate();
    } catch {
      toast.error("Failed to update topic status");
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group rounded-xl transition-all duration-150 bg-white border border-gray-200 hover:border-[#249E5E]/40 hover:shadow-xs",
        isDragging ? "shadow-md ring-2 ring-[#249E5E]" : ""
      )}
      style={style}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Order index */}
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-100 flex-shrink-0">
          {index + 1}
        </span>

        {/* Drag handle */}
        {!isLocked && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
            title="Drag to reorder"
            aria-label="Drag to reorder topic"
          >
            <GripVertical className="w-4 h-4 stroke-[1.5]" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
          {item.description && !expanded && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
          )}
        </div>

        {/* Duration badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs text-gray-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-gray-400 stroke-[1.5]" />
            {item.duration_minutes}m
          </span>

          {/* Status pill button */}
          <button
            id={`agenda-status-${item.id}-btn`}
            onClick={cycleStatus}
            disabled={isLocked}
            title={isLocked ? "Locked by MoM approval" : "Click to cycle status"}
            aria-label={`Cycle status: currently ${item.status}`}
            className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all hover:opacity-85 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E] shadow-2xs", statusStyle)}
          >
            {item.status.replace("_", " ")}
          </button>

          {/* Expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse details" : "Expand details"}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]"
          >
            {expanded ? <ChevronUp className="w-4 h-4 stroke-[1.5]" /> : <ChevronDown className="w-4 h-4 stroke-[1.5]" />}
          </button>

          {/* Delete */}
          {!isLocked && (
            <button
              id={`delete-agenda-item-${item.id}-btn`}
              onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              title="Delete topic"
              aria-label="Delete topic"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3.5 border-t border-gray-100 pt-3 bg-gray-50/60 rounded-b-xl fade-in space-y-2">
          {item.description && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Description</span>
              <p className="text-sm text-gray-700 leading-relaxed mt-0.5">{item.description}</p>
            </div>
          )}
          {item.facilitator_notes && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Facilitator Guidance</span>
              <p className="text-xs text-gray-600 italic mt-0.5">{item.facilitator_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

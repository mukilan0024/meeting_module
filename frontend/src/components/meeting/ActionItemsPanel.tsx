"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, ExternalLink, CheckCircle2, Loader2, ArrowUpRight, Check, X, ShieldCheck } from "lucide-react";
import { actionItemsApi } from "@/lib/api";
import type { ActionItem, ActionPriority } from "@/lib/types";
import { cn, PRIORITY_STYLES, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const PRIORITIES: ActionPriority[] = ["low", "medium", "high", "critical"];

export function ActionItemsPanel({ meetingId }: { meetingId: string }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<ActionPriority>("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // In-app task conversion modal state
  const [convertingItem, setConvertingItem] = useState<ActionItem | null>(null);
  const [taskIdInput, setTaskIdInput] = useState("");
  const [converting, setConverting] = useState(false);

  const { data, mutate } = useSWR(["action-items", meetingId], () => actionItemsApi.list(meetingId));
  const items: ActionItem[] = data?.items ?? [];

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await actionItemsApi.create({
        meeting_id: meetingId,
        title: newTitle.trim(),
        priority: newPriority,
        due_date: newDueDate || undefined,
      });
      setNewTitle("");
      setNewPriority("medium");
      setNewDueDate("");
      setAdding(false);
      mutate();
      toast.success("Action item added");
    } catch {
      toast.error("Failed to add action item");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (item: ActionItem) => {
    try {
      await actionItemsApi.update(item.id, { status: item.status === "completed" ? "open" : "completed" });
      mutate();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await actionItemsApi.delete(id);
      mutate();
      toast.success("Item deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleOpenConvert = (item: ActionItem) => {
    setConvertingItem(item);
    setTaskIdInput("");
  };

  const handleConfirmConvert = async () => {
    if (!convertingItem || !taskIdInput.trim()) return;
    setConverting(true);
    try {
      await actionItemsApi.convertToTask(convertingItem.id, { external_task_id: taskIdInput.trim() });
      mutate();
      toast.success(`Converted to formal project task: ${taskIdInput.trim()}`);
      setConvertingItem(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to convert task");
    } finally {
      setConverting(false);
    }
  };

  const open = items.filter((i) => i.status !== "completed");
  const completed = items.filter((i) => i.status === "completed");

  return (
    <div className="h-full overflow-y-auto max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Meeting Action Items</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {open.length} pending · {completed.length} completed
          </p>
        </div>
        <button
          id="add-action-item-btn"
          onClick={() => setAdding(true)}
          className="btn-dsm-primary flex items-center gap-1.5 text-xs px-3.5 shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2]" /> Add Action Item
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-5 p-4 rounded-xl bg-white border border-[#249E5E]/40 shadow-sm fade-in space-y-3">
          <input
            id="action-title-input"
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Action item description or deliverable…"
            className="input-dsm w-full"
          />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              id="action-priority-select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as ActionPriority)}
              className="input-dsm flex-1 capitalize"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p} priority</option>
              ))}
            </select>
            <input
              id="action-due-date-input"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="input-dsm flex-1"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="save-action-item-btn"
                onClick={handleAdd}
                disabled={saving}
                className="btn-dsm-primary text-xs px-3.5 shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
              <button
                id="cancel-action-item-btn"
                onClick={() => setAdding(false)}
                className="btn-dsm-neutral text-xs px-3.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action items list */}
      <div className="space-y-2">
        {[...open, ...completed].map((item) => (
          <div
            key={item.id}
            className={cn(
              "group flex items-center gap-3.5 px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-[#249E5E]/40 hover:bg-[#F8FDF9] transition-all shadow-2xs",
              item.status === "completed" ? "bg-gray-50/70 opacity-75" : ""
            )}
          >
            {/* Completion checkbox */}
            <button
              id={`complete-action-${item.id}-btn`}
              onClick={() => handleComplete(item)}
              aria-label={item.status === "completed" ? "Mark incomplete" : "Mark complete"}
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]",
                item.status === "completed"
                  ? "border-[#249E5E] bg-[#249E5E] text-white"
                  : "border-gray-300 hover:border-[#249E5E] bg-white"
              )}
            >
              {item.status === "completed" && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            </button>

            {/* Item details */}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold text-gray-900 truncate", item.status === "completed" && "line-through text-gray-400 font-normal")}>
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs", PRIORITY_STYLES[item.priority])}>
                  {item.priority.toUpperCase()}
                </span>
                {item.due_date && (
                  <span className="text-[11px] text-gray-600 font-medium">Due: {formatDate(item.due_date)}</span>
                )}
                {item.converted_to_task && (
                  <a
                    href={item.external_task_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#177042] bg-[#E8F7F0] px-2 py-0.5 rounded-md border border-[#249E5E]/20 hover:underline shadow-2xs"
                  >
                    <ArrowUpRight className="w-3 h-3 stroke-[2]" />
                    {item.external_task_id}
                  </a>
                )}
                {item.ai_confidence_score != null && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/20 shadow-2xs">
                    AI Confidence {Math.round(item.ai_confidence_score * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
              {!item.converted_to_task && (
                <button
                  id={`convert-task-${item.id}-btn`}
                  onClick={() => handleOpenConvert(item)}
                  title="Convert to project task"
                  aria-label="Convert to project task"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#177042] hover:bg-[#E8F7F0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]"
                >
                  <ExternalLink className="w-4 h-4 stroke-[1.75]" />
                </button>
              )}
              <button
                id={`delete-action-${item.id}-btn`}
                onClick={() => handleDelete(item.id)}
                title="Delete action item"
                aria-label="Delete action item"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Trash2 className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && !adding && (
          <div className="empty-state-dsm">
            <div className="w-12 h-12 rounded-xl bg-[#E8F7F0] border border-[#249E5E]/20 flex items-center justify-center mb-3 text-[#177042] shadow-xs">
              <CheckCircle2 className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-gray-900 font-bold text-sm">No action items defined</h3>
            <p className="text-gray-500 text-xs mt-1 max-w-xs">
              Keep commitments actionable by creating action items or auto-extracting them via AI.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="btn-dsm-secondary mt-4 text-xs flex items-center gap-1.5 px-3.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" /> Add First Item
            </button>
          </div>
        )}
      </div>

      {/* Styled Task Conversion Modal */}
      {convertingItem && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="convert-dialog-title">
          <div className="modal-container">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F7F0] flex items-center justify-center text-[#177042] border border-[#249E5E]/20 shadow-xs">
                  <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 id="convert-dialog-title" className="font-bold text-[#111827] text-[16px]">Convert to Project Task</h3>
                  <p className="text-[12px] text-[#6B7280]">Link action to Jira, Linear, or host TaskPort</p>
                </div>
              </div>
              <button
                onClick={() => setConvertingItem(null)}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Action Item</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{convertingItem.title}</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1">
                  External Task Identifier *
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. TASK-1042 or LIN-89"
                  value={taskIdInput}
                  onChange={(e) => setTaskIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmConvert()}
                  className="input-dsm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setConvertingItem(null)}
                className="btn-dsm-neutral text-xs px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                disabled={converting || !taskIdInput.trim()}
                className="btn-dsm-primary text-xs px-4 shadow-sm"
              >
                {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 stroke-[1.75]" />}
                <span>{converting ? "Linking…" : "Link & Convert"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

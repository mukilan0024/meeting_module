"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, Loader2, UserCheck, Clock, Users } from "lucide-react";
import { participantsApi } from "@/lib/api";
import type { Participant, ParticipantRole, ListResponse } from "@/lib/types";
import { cn, ROLE_STYLES, initials, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

const ROLES: ParticipantRole[] = ["organizer", "presenter", "attendee", "optional", "guest"];

export function ParticipantManager({ meetingId }: { meetingId: string }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ user_id: "", user_email: "", user_name: "", role: "attendee" as ParticipantRole });
  const [saving, setSaving] = useState(false);

  const { data, mutate } = useSWR<ListResponse<Participant>>(["participants", meetingId], () => participantsApi.list(meetingId));
  const participants: Participant[] = data?.items ?? [];

  const handleAdd = async () => {
    if (!form.user_name || !form.user_email) return;
    setSaving(true);
    try {
      await participantsApi.add({ ...form, meeting_id: meetingId, user_id: form.user_id || form.user_email });
      setForm({ user_id: "", user_email: "", user_name: "", role: "attendee" });
      setAdding(false);
      mutate();
      toast.success("Participant added");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to add participant");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await participantsApi.remove(id);
      mutate();
      toast.success("Participant removed");
    } catch {
      toast.error("Failed to remove participant");
    }
  };

  const handleRoleChange = async (id: string, role: ParticipantRole) => {
    try {
      await participantsApi.update(id, { role });
      mutate();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleMarkJoined = async (id: string) => {
    try {
      await participantsApi.updateAttendance(id, { joined_at: new Date().toISOString() });
      mutate();
      toast.success("Marked as joined");
    } catch {
      toast.error("Failed to mark attendance");
    }
  };

  return (
    <div className="h-full overflow-y-auto max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Meeting Participants</h2>
          <p className="text-xs text-gray-500 mt-0.5">{participants.length} members registered</p>
        </div>
        <button
          id="add-participant-btn"
          onClick={() => setAdding(true)}
          className="btn-dsm-primary flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[1.5]" /> Invite Participant
        </button>
      </div>

      {/* Invite form */}
      {adding && (
        <div className="mb-5 p-4 rounded-xl bg-white border border-[#249E5E]/30 shadow-sm fade-in space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              id="participant-name-input"
              type="text"
              placeholder="Full Name *"
              value={form.user_name}
              onChange={(e) => setForm({ ...form, user_name: e.target.value })}
              className="input-dsm"
            />
            <input
              id="participant-email-input"
              type="email"
              placeholder="Email address *"
              value={form.user_email}
              onChange={(e) => setForm({ ...form, user_email: e.target.value })}
              className="input-dsm"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              id="participant-role-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as ParticipantRole })}
              className="input-dsm flex-1 capitalize"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="save-participant-btn"
                onClick={handleAdd}
                disabled={saving}
                className="btn-dsm-primary"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
              <button
                onClick={() => setAdding(false)}
                className="btn-dsm-neutral"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participant rows */}
      <div className="space-y-2">
        {participants.map((p: Participant) => (
          <div
            key={p.id}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-[#249E5E]/40 hover:bg-[#F8FDF9] transition-all shadow-2xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* DSM Avatar */}
              <div className="w-9 h-9 rounded-lg bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/20 flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs">
                {initials(p.user_name)}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.user_name}</p>
                <p className="text-xs text-gray-500 truncate">{p.user_email}</p>
                {p.joined_at && (
                  <p className="text-[11px] font-semibold text-[#177042] flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3 h-3 stroke-[2]" /> Joined {formatDateTime(p.joined_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
              <select
                value={p.role}
                onChange={(e) => handleRoleChange(p.id, e.target.value as ParticipantRole)}
                aria-label={`Role for ${p.user_name}`}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#249E5E] transition-all shadow-2xs",
                  ROLE_STYLES[p.role]
                )}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>

              {!p.joined_at && (
                <button
                  id={`mark-joined-${p.id}-btn`}
                  onClick={() => handleMarkJoined(p.id)}
                  title="Mark attendance"
                  aria-label={`Mark attendance for ${p.user_name}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#177042] hover:bg-[#E8F7F0] transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]"
                >
                  <Clock className="w-4 h-4 stroke-[1.75]" />
                </button>
              )}

              <button
                id={`remove-participant-${p.id}-btn`}
                onClick={() => handleRemove(p.id)}
                title="Remove participant"
                aria-label={`Remove ${p.user_name}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Trash2 className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>
          </div>
        ))}

        {participants.length === 0 && !adding && (
          <div className="empty-state-dsm">
            <div className="w-12 h-12 rounded-xl bg-[#E8F7F0] border border-[#249E5E]/20 flex items-center justify-center mb-3 text-[#177042] shadow-xs">
              <Users className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-gray-900 font-bold text-sm">No participants registered</h3>
            <p className="text-gray-500 text-xs mt-1 max-w-xs">
              Invite team members and project stakeholders to participate in this meeting.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="btn-dsm-secondary mt-4 text-xs flex items-center gap-1.5 px-3.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" /> Invite First Member
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

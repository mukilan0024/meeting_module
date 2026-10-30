"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  X, Calendar, Clock, MapPin, Link2, Users, ListChecks,
  FileText, Sparkles, Trash2, ExternalLink, ChevronRight
} from "lucide-react";
import { meetingsApi, participantsApi } from "@/lib/api";
import type { Meeting } from "@/lib/types";
import { cn, formatDateTime, getMeetingDuration, MEETING_STATUS_STYLES, MEETING_TYPE_LABEL, initials } from "@/lib/utils";
import { toast } from "sonner";

interface MeetingDetailPanelProps {
  meeting: Meeting;
  onClose: () => void;
  onUpdated: () => void;
}

export function MeetingDetailPanel({ meeting, onClose, onUpdated }: MeetingDetailPanelProps) {
  const [deleting, setDeleting] = useState(false);

  const { data: participantData } = useSWR(
    ["participants", meeting.id],
    () => participantsApi.list(meeting.id)
  );
  const participants = participantData?.items ?? [];

  const handleDelete = async () => {
    if (!confirm("Delete this meeting? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await meetingsApi.delete(meeting.id);
      toast.success("Meeting deleted");
      onUpdated();
    } catch {
      toast.error("Failed to delete meeting");
    } finally {
      setDeleting(false);
    }
  };

  const statusStyle = MEETING_STATUS_STYLES[meeting.status] ?? "";

  return (
    <aside
      className="w-80 xl:w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden slide-in-right z-20"
      style={{ boxShadow: "-8px 0 32px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border mb-2", statusStyle)}>
              {meeting.status.replace("_", " ").toUpperCase()}
            </span>
            <h2 className="font-bold text-gray-900 text-base leading-snug truncate">{meeting.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5 capitalize font-medium">
              {MEETING_TYPE_LABEL[meeting.meeting_type] ?? meeting.meeting_type}
            </p>
          </div>
          <button
            id="close-detail-panel-btn"
            onClick={onClose}
            aria-label="Close details panel"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]"
            title="Close panel"
          >
            <X className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Time */}
        <InfoRow icon={Calendar}>
          <span className="text-gray-900 text-sm font-semibold">{formatDateTime(meeting.start_time)}</span>
          <span className="text-gray-500 text-xs font-medium">to {formatDateTime(meeting.end_time)}</span>
          <span className="badge-dsm bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/20 w-fit mt-1">
            {getMeetingDuration(meeting.start_time, meeting.end_time)}
          </span>
        </InfoRow>

        {/* Location */}
        {meeting.physical_location && (
          <InfoRow icon={MapPin}>
            <span className="text-gray-800 text-sm font-medium">{meeting.physical_location}</span>
          </InfoRow>
        )}

        {/* Meeting URL */}
        {meeting.meeting_url && (
          <InfoRow icon={Link2}>
            <a
              href={meeting.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#177042] hover:text-[#115733] hover:underline text-sm font-semibold flex items-center gap-1.5 truncate"
            >
              Join Virtual Room <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.75]" />
            </a>
          </InfoRow>
        )}

        {/* Description */}
        {meeting.description && (
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{meeting.description}</p>
          </div>
        )}

        {/* Participants */}
        <div className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="flex items-center gap-2 mb-2.5">
            <Users className="w-4 h-4 text-gray-500 stroke-[1.5]" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Participants ({participants.length})
            </span>
          </div>
          {participants.length === 0 ? (
            <p className="text-xs text-gray-400">No participants registered</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {participants.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  title={`${p.user_name} (${p.role})`}
                  className="w-8 h-8 rounded-lg bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/20 flex items-center justify-center text-[11px] font-bold shadow-2xs"
                >
                  {initials(p.user_name)}
                </div>
              ))}
              {participants.length > 8 && (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200">
                  +{participants.length - 8}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="space-y-1 pt-1">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1">Quick Actions</div>
          <QuickLink href={`/meetings/${meeting.id}?tab=agenda`} icon={ListChecks} label="Agenda Builder" />
          <QuickLink href={`/meetings/${meeting.id}?tab=notes`} icon={FileText} label="Collaborative MoM Notes" />
          <QuickLink href={`/meetings/${meeting.id}?tab=ai`} icon={Sparkles} label="AI Intelligence Hub" />
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <button
          id="delete-meeting-btn"
          onClick={handleDelete}
          disabled={deleting}
          className="btn-dsm-danger flex items-center gap-1.5 text-xs px-3"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <Link
          href={`/meetings/${meeting.id}`}
          id="open-meeting-detail-btn"
          className="btn-dsm-primary flex items-center gap-1.5 text-xs px-3.5"
        >
          Open Workspace <ChevronRight className="w-4 h-4 stroke-[1.75]" />
        </Link>
      </div>
    </aside>
  );
}

function InfoRow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 stroke-[1.5]" />
      <div className="flex flex-col gap-0.5 min-w-0">{children}</div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-[#177042] stroke-[1.75]" />
        <span>{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 stroke-[1.5]" />
    </Link>
  );
}

"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, ListChecks, FileText, CheckSquare,
  Users, Sparkles, FileSignature, ChevronRight, Calendar,
  Play, CheckCircle2, Loader2,
} from "lucide-react";
import { parseISO, differenceInMinutes } from "date-fns";
import { meetingsApi, momApi } from "@/lib/api";
import { cn, formatDateTime, getMeetingDuration, MEETING_STATUS_STYLES, MEETING_TYPE_LABEL } from "@/lib/utils";
import { AgendaBuilder } from "@/components/agenda/AgendaBuilder";
import { ActionItemsPanel } from "@/components/meeting/ActionItemsPanel";
import { ParticipantManager } from "@/components/meeting/ParticipantManager";
import { CollaborativeEditor } from "@/components/notes/CollaborativeEditor";
import { AIPanel } from "@/components/ai/AIPanel";
import { MoMSignOffPanel } from "@/components/mom/MoMSignOffPanel";
import { toast } from "sonner";

type Tab = "agenda" | "notes" | "actions" | "participants" | "ai" | "mom";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "agenda",       label: "Agenda",       icon: ListChecks },
  { id: "notes",        label: "Live Notes",   icon: FileText },
  { id: "actions",      label: "Action Items", icon: CheckSquare },
  { id: "participants", label: "Participants", icon: Users },
  { id: "ai",          label: "AI Governance", icon: Sparkles },
  { id: "mom",         label: "MoM Sign-Off",  icon: FileSignature },
];

export function MeetingWorkspace({ meetingId }: { meetingId: string }) {
  const searchParams = useSearchParams();
  const queryTab = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>("agenda");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (queryTab && ["agenda", "notes", "actions", "participants", "ai", "mom"].includes(queryTab)) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const { data: meeting, isLoading, error, mutate: refreshMeeting } = useSWR(
    ["meeting", meetingId],
    () => meetingsApi.get(meetingId),
    { revalidateOnFocus: false }
  );

  const { data: momStatus } = useSWR(
    ["mom-status", meetingId],
    () => momApi.getStatus(meetingId)
  );

  const isLocked = momStatus?.all_approved ?? false;

  const handleStatusTransition = async (nextStatus: "in_progress" | "completed") => {
    setUpdatingStatus(true);
    try {
      await meetingsApi.update(meetingId, { status: nextStatus });
      refreshMeeting();
      toast.success(`Meeting status updated to ${nextStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update meeting status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F9FAFB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
          <div className="w-48 h-3.5 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F9FAFB]">
        <div className="text-center p-8 bg-white border border-gray-200 rounded-xl shadow-sm max-w-sm">
          <p className="text-red-600 font-semibold text-sm">Meeting not found or server error.</p>
          <Link href="/meetings" className="btn-dsm-secondary text-xs mt-4 inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" /> Return to Meetings
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = MEETING_STATUS_STYLES[meeting.status] ?? "";
  const scheduledMinutes = meeting.start_time && meeting.end_time
    ? Math.max(1, differenceInMinutes(parseISO(meeting.end_time), parseISO(meeting.start_time)))
    : 60;

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* Header */}
      <header className="px-4 sm:px-6 pt-4 sm:pt-5 bg-white border-b border-gray-200 shadow-xs">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2.5">
          <Link
            href="/meetings"
            className="text-[#177042] hover:text-[#115733] hover:underline font-semibold flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E] rounded px-1 -mx-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" /> Meetings
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-400 stroke-[1.5]" />
          <span className="text-gray-700 font-semibold truncate max-w-md">{meeting.title}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs", statusStyle)}>
                {meeting.status.replace("_", " ").toUpperCase()}
              </span>
              <span className="text-gray-600 text-[11px] font-semibold bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                {MEETING_TYPE_LABEL[meeting.meeting_type] ?? meeting.meeting_type}
              </span>
              {isLocked && (
                <span className="badge-dsm bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                  MoM Locked
                </span>
              )}
            </div>
            <h1 className="font-bold text-gray-900 text-lg sm:text-xl leading-snug truncate">{meeting.title}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1.5 font-medium text-gray-600">
                <Calendar className="w-3.5 h-3.5 text-gray-400 stroke-[1.75]" />
                {formatDateTime(meeting.start_time)}
              </span>
              <span>·</span>
              <span className="badge-dsm bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/20">
                {getMeetingDuration(meeting.start_time, meeting.end_time)}
              </span>
            </div>
          </div>

          {/* Quick status progression actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {meeting.status === "scheduled" && (
              <button
                id="start-meeting-btn"
                onClick={() => handleStatusTransition("in_progress")}
                disabled={updatingStatus}
                className="btn-dsm-primary text-xs flex items-center gap-1.5 px-3.5 shadow-sm"
              >
                {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Start Meeting</span>
              </button>
            )}
            {meeting.status === "in_progress" && (
              <button
                id="complete-meeting-btn"
                onClick={() => handleStatusTransition("completed")}
                disabled={updatingStatus}
                className="btn-dsm-primary text-xs flex items-center gap-1.5 px-3.5 shadow-sm"
              >
                {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Complete Meeting</span>
              </button>
            )}
          </div>
        </div>

        {/* DSM Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-gray-100 pt-1 -mb-[1px]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`tab-${id}-btn`}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-all border-b-2 rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]",
                  isActive
                    ? "border-[#249E5E] text-[#177042] bg-[#E8F7F0]/60 shadow-2xs"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <Icon className={cn("w-4 h-4 stroke-[1.75]", isActive ? "text-[#249E5E]" : "text-gray-400")} />
                {label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Tab content area */}
      <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-[#F9FAFB]">
        <div className="h-full fade-in" key={activeTab}>
          {activeTab === "agenda"       && <AgendaBuilder meetingId={meetingId} scheduledDurationMinutes={scheduledMinutes} isLocked={isLocked} />}
          {activeTab === "notes"        && <CollaborativeEditor meetingId={meetingId} noteType="live_notes" isLocked={isLocked} />}
          {activeTab === "actions"      && <ActionItemsPanel meetingId={meetingId} />}
          {activeTab === "participants" && <ParticipantManager meetingId={meetingId} />}
          {activeTab === "ai"          && <AIPanel meetingId={meetingId} />}
          {activeTab === "mom"         && <MoMSignOffPanel meetingId={meetingId} />}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import {
  Plus, RefreshCw, Search, Calendar, Clock,
  CheckCircle2, AlertCircle, FileText
} from "lucide-react";
import { MeetingCalendar } from "@/components/calendar/MeetingCalendar";
import { MeetingFormDialog } from "@/components/meeting/MeetingFormDialog";
import { MeetingDetailPanel } from "@/components/meeting/MeetingDetailPanel";
import { meetingsApi } from "@/lib/api";
import type { Meeting } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MeetingsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<
    "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "resourceTimelineDay"
  >("timeGridWeek");

  const { data, error, isLoading, mutate } = useSWR(
    ["meetings"],
    () => meetingsApi.list({ page_size: 200 }),
    { refreshInterval: 30_000 }
  );

  const allMeetings = useMemo(() => data?.items ?? [], [data?.items]);

  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return allMeetings;
    const q = searchQuery.toLowerCase();
    return allMeetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.meeting_type.toLowerCase().includes(q)
    );
  }, [allMeetings, searchQuery]);

  // Statistics calculation for DSM Stat Cards
  const stats = useMemo(() => {
    const total = allMeetings.length;
    const scheduled = allMeetings.filter((m) => m.status === "scheduled").length;
    const inProgress = allMeetings.filter((m) => m.status === "in_progress").length;
    const completed = allMeetings.filter((m) => m.status === "completed").length;
    return { total, scheduled, inProgress, completed };
  }, [allMeetings]);

  const handleMeetingClick = useCallback((meeting: Meeting) => {
    setSelectedMeeting(meeting);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateDialog(false);
    mutate();
  }, [mutate]);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* ── Top Header (DSM Page Header) ────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white border-b border-[#E5E7EB] sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] sm:text-[20px] font-bold text-[#111827] tracking-tight">Meeting Governance</h1>
            <span className="badge-dsm bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/20">
              Active Module
            </span>
          </div>
          <p className="text-[12px] text-[#6B7280] mt-0.5 hidden sm:block">
            FullCalendar scheduling, conflict engine, live notes & Ollama governance
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Input (Fixed DSM: left: 10px icon positioning, 38px height) */}
          <div className="relative hidden md:block">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#9CA3AF] pointer-events-none" strokeWidth={1.5} />
            <input
              id="meeting-search"
              type="text"
              placeholder="Search meetings by title or type…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 lg:w-72 min-h-[38px] pl-[34px] pr-8 text-[13px] bg-white border border-[#E5E7EB] rounded-[8px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#249E5E] focus:ring-2 focus:ring-[#249E5E]/15 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Refresh Button (DSM Neutral Button) */}
          <button
            id="refresh-meetings-btn"
            onClick={() => mutate()}
            title="Refresh schedule"
            aria-label="Refresh schedule"
            className="btn-dsm-neutral min-h-[38px] px-3 shadow-xs"
          >
            <RefreshCw className={cn("w-[14px] h-[14px] text-[#4B5563]", isLoading && "animate-spin")} strokeWidth={1.5} />
          </button>

          {/* Schedule Meeting (DSM Primary Button: 38px height, #249E5E, 6px icon gap) */}
          <button
            id="create-meeting-btn"
            onClick={() => setShowCreateDialog(true)}
            className="btn-dsm-primary min-h-[38px] px-4 shadow-sm"
          >
            <Plus className="w-[15px] h-[15px]" strokeWidth={2} />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </header>

      {/* ── Main View Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 space-y-4">
        {/* ── DSM Stat Cards Row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Meetings */}
          <div className="card-dsm card-dsm-hover p-4 bg-white flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#6B7280]">Total Meetings</p>
              <p className="text-[24px] font-bold text-[#111827] mt-0.5 leading-none">{stats.total}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#E8F7F0] flex items-center justify-center text-[#177042] border border-[#249E5E]/20 shadow-xs">
              <Calendar className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>

          {/* Scheduled */}
          <div className="card-dsm card-dsm-hover p-4 bg-white flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#6B7280]">Scheduled</p>
              <p className="text-[24px] font-bold text-[#177042] mt-0.5 leading-none">{stats.scheduled}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#E8F7F0] flex items-center justify-center text-[#177042] border border-[#249E5E]/20 shadow-xs">
              <Clock className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>

          {/* In Progress */}
          <div className="card-dsm card-dsm-hover p-4 bg-white flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#6B7280]">In Progress</p>
              <p className="text-[24px] font-bold text-[#14532D] mt-0.5 leading-none">{stats.inProgress}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#14532D] border border-[#16A34A]/25 shadow-xs">
              <AlertCircle className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>

          {/* Completed */}
          <div className="card-dsm card-dsm-hover p-4 bg-white flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#6B7280]">Completed</p>
              <p className="text-[24px] font-bold text-[#374151] mt-0.5 leading-none">{stats.completed}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#4B5563] border border-[#E5E7EB] shadow-xs">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* ── View Selector & Calendar Toolbar ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-2.5 rounded-[12px] border border-[#E5E7EB] shadow-xs gap-3">
          {/* Segmented View Mode Tabs */}
          <div className="inline-flex p-1 bg-[#F3F4F6] rounded-[8px] border border-[#E5E7EB] gap-1 overflow-x-auto">
            {(
              [
                ["timeGridWeek", "Week View"],
                ["dayGridMonth", "Month View"],
                ["timeGridDay", "Day View"],
                ["resourceTimelineDay", "Timeline"],
              ] as const
            ).map(([view, label]) => (
              <button
                key={view}
                id={`view-${view}-btn`}
                onClick={() => setViewMode(view)}
                className={cn(
                  "px-3 py-1.5 text-[12px] rounded-[6px] font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]",
                  viewMode === view
                    ? "bg-white text-[#177042] font-semibold shadow-xs border border-[#E5E7EB]"
                    : "text-[#6B7280] hover:text-[#111827]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[12px] text-[#4B5563] flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#249E5E] ring-2 ring-[#E8F7F0]" /> Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-2 ring-[#DCFCE7]" /> In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF] ring-2 ring-[#F3F4F6]" /> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] ring-2 ring-[#FEE2E2]" /> Cancelled
            </span>
          </div>
        </div>

        {/* ── Calendar / Side-Drawer Layout ──────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex relative rounded-xl">
          <div className="flex-1 overflow-auto">
            {error ? (
              <div className="card-dsm p-12 text-center text-[#DC2626] text-[13px] bg-white">
                Failed to load meetings. Ensure the FastAPI backend is running at http://localhost:8000.
              </div>
            ) : (
              <MeetingCalendar
                meetings={filteredMeetings}
                viewMode={viewMode}
                onMeetingClick={handleMeetingClick}
                onMeetingDrop={(_id, _start, _end) => mutate()}
              />
            )}
          </div>

          {/* ── Slide-Over Side Drawer for Meeting Detail with Backdrop on Small Screens ── */}
          {selectedMeeting && (
            <>
              <div
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-20 xl:hidden"
                onClick={() => setSelectedMeeting(null)}
                aria-hidden="true"
              />
              <MeetingDetailPanel
                meeting={selectedMeeting}
                onClose={() => setSelectedMeeting(null)}
                onUpdated={() => { mutate(); setSelectedMeeting(null); }}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Create Meeting Dialog ───────────────────────────────────────────── */}
      {showCreateDialog && (
        <MeetingFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

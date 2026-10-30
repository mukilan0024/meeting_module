"use client";

import { useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import rrulePlugin from "@fullcalendar/rrule";
import type { EventClickArg, EventDropArg, EventInput, EventApi } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import type { Meeting, MeetingStatus } from "@/lib/types";
import { meetingsApi } from "@/lib/api";
import { toast } from "sonner";

const STATUS_COLORS: Record<MeetingStatus, { bg: string; border: string; text: string }> = {
  scheduled:   { bg: "#E8F7F0", border: "#249E5E", text: "#177042" },
  in_progress: { bg: "#DCFCE7", border: "#16A34A", text: "#14532D" },
  completed:   { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151" },
  cancelled:   { bg: "#FEE2E2", border: "#DC2626", text: "#991B1B" },
  postponed:   { bg: "#FEF3C7", border: "#D97706", text: "#92400E" },
};

const DEFAULT_RESOURCES = [
  { id: "Boardroom 4B", title: "Boardroom 4B (Main)" },
  { id: "Focus Room 1", title: "Focus Room 1" },
  { id: "Executive Boardroom", title: "Executive Suite" },
  { id: "General", title: "Virtual / General Workspace" },
];

interface MeetingCalendarProps {
  meetings: Meeting[];
  viewMode: string;
  onMeetingClick: (meeting: Meeting) => void;
  onMeetingDrop: (id: string, start: string, end: string) => void;
}

export function MeetingCalendar({
  meetings,
  viewMode,
  onMeetingClick,
  onMeetingDrop,
}: MeetingCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);

  const events: EventInput[] = meetings.map((m) => {
    const colors = STATUS_COLORS[m.status] ?? STATUS_COLORS.scheduled;
    const resourceId = m.physical_location || "General";
    return {
      id: m.id,
      title: m.title,
      start: m.start_time,
      end: m.end_time,
      resourceId,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: { meeting: m, statusColors: colors },
      ...(m.recurrence_rule
        ? { rrule: { dtstart: m.start_time, ...parseRRule(m.recurrence_rule) } }
        : {}),
    };
  });

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const meeting: Meeting = info.event.extendedProps.meeting;
      onMeetingClick(meeting);
    },
    [onMeetingClick]
  );

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const meeting: Meeting = info.event.extendedProps.meeting;
      const newStart = info.event.startStr;
      let newEnd = info.event.endStr;
      if (!newEnd) {
        // Fallback: preserve original duration
        const origDurationMs = new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime();
        newEnd = new Date(new Date(newStart).getTime() + (origDurationMs > 0 ? origDurationMs : 3600000)).toISOString();
      }

      try {
        const conflict = await meetingsApi.checkConflicts({
          created_by: meeting.created_by,
          start_time: newStart,
          end_time: newEnd,
          exclude_meeting_id: meeting.id,
        });

        if (conflict.has_conflict) {
          toast.error(
            `Scheduling conflict with "${conflict.conflicting_meetings[0]?.title}". Drop reverted.`
          );
          info.revert();
          return;
        }

        await meetingsApi.update(meeting.id, { start_time: newStart, end_time: newEnd });
        toast.success("Meeting rescheduled");
        onMeetingDrop(meeting.id, newStart, newEnd);
      } catch {
        toast.error("Failed to reschedule meeting");
        info.revert();
      }
    },
    [onMeetingDrop]
  );

  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      const meeting: Meeting = info.event.extendedProps.meeting;
      const newStart = info.event.startStr;
      const newEnd = info.event.endStr || (info.event.start ? new Date(info.event.start.getTime() + 3600000).toISOString() : "");

      try {
        const conflict = await meetingsApi.checkConflicts({
          created_by: meeting.created_by,
          start_time: newStart,
          end_time: newEnd,
          exclude_meeting_id: meeting.id,
        });

        if (conflict.has_conflict) {
          toast.error(
            `Scheduling conflict with "${conflict.conflicting_meetings[0]?.title}". Resize reverted.`
          );
          info.revert();
          return;
        }

        await meetingsApi.update(meeting.id, { start_time: newStart, end_time: newEnd });
        toast.success("Meeting duration updated");
        onMeetingDrop(meeting.id, newStart, newEnd);
      } catch {
        toast.error("Failed to update meeting duration");
        info.revert();
      }
    },
    [onMeetingDrop]
  );

  return (
    <div
      className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimelinePlugin, rrulePlugin]}
        initialView={viewMode}
        key={viewMode}
        events={events}
        resources={DEFAULT_RESOURCES}
        editable
        droppable
        selectable
        selectMirror
        dayMaxEvents={3}
        weekends
        nowIndicator
        height="calc(100vh - 240px)"
        headerToolbar={false}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventContent={(info) => <CalendarEventContent event={info.event} />}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:30:00"
        allDayText="All Day"
        scrollTime="08:00:00"
        businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "18:00" }}
      />
    </div>
  );
}

function CalendarEventContent({ event }: { event: EventApi }) {
  const meeting: Meeting = event.extendedProps?.meeting;
  const statusColors = event.extendedProps?.statusColors ?? STATUS_COLORS.scheduled;

  return (
    <div className="px-2 py-1 w-full overflow-hidden leading-tight">
      <p className="text-[12px] font-semibold truncate" style={{ color: statusColors.text }}>
        {event.title}
      </p>
      {meeting?.meeting_type && (
        <p className="text-[10px] text-[#6B7280] truncate capitalize mt-0.5">
          {meeting.meeting_type.replace("_", " ")}
        </p>
      )}
    </div>
  );
}

function parseRRule(rrule: string): Record<string, unknown> {
  const parts: Record<string, string> = {};
  rrule.replace("RRULE:", "").split(";").forEach((part) => {
    const [k, v] = part.split("=");
    parts[k] = v;
  });
  const freqMap: Record<string, string> = {
    DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly", YEARLY: "yearly",
  };
  return {
    freq: freqMap[parts.FREQ] ?? "weekly",
    ...(parts.INTERVAL ? { interval: parseInt(parts.INTERVAL) } : {}),
    ...(parts.COUNT ? { count: parseInt(parts.COUNT) } : {}),
    ...(parts.UNTIL ? { until: parts.UNTIL } : {}),
    ...(parts.BYDAY ? { byweekday: parts.BYDAY.split(",") } : {}),
  };
}

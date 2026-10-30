import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO, differenceInMinutes } from "date-fns";
import type { MeetingStatus, ActionPriority, AgendaItemStatus, ParticipantRole } from "./types";

// ── Tailwind class merger ──────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Date formatting ────────────────────────────────────────────────────────────
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy • h:mm a");
  } catch {
    return "—";
  }
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return "—";
  }
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return "recently";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "recently";
  }
}

export function getMeetingDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "—";
  try {
    const mins = differenceInMinutes(parseISO(end), parseISO(start));
    if (mins <= 0) return "0m";
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  } catch {
    return "—";
  }
}

// ── Status badge colours (DSM Specification — High-Contrast Accessible) ────────
export const MEETING_STATUS_STYLES: Record<MeetingStatus, string> = {
  scheduled:   "bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/30",
  in_progress: "bg-[#DCFCE7] text-[#14532D] border border-[#16A34A]/30",
  completed:   "bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]",
  cancelled:   "bg-[#FEE2E2] text-[#991B1B] border border-[#DC2626]/30",
  postponed:   "bg-[#FEF3C7] text-[#92400E] border border-[#D97706]/30",
};

export const PRIORITY_STYLES: Record<ActionPriority, string> = {
  low:      "bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]",
  medium:   "bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]",
  high:     "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
  critical: "bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]",
};

export const AGENDA_STATUS_STYLES: Record<AgendaItemStatus, string> = {
  pending:     "bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]",
  in_progress: "bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/30",
  completed:   "bg-[#DCFCE7] text-[#14532D] border border-[#16A34A]/30",
  skipped:     "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
  deferred:    "bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]",
};

export const ROLE_STYLES: Record<ParticipantRole, string> = {
  organizer: "bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/30 font-semibold",
  presenter: "bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD] font-semibold",
  attendee:  "bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]",
  optional:  "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]",
  guest:     "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
};

// ── Meeting type labels ───────────────────────────────────────────────────────
export const MEETING_TYPE_LABEL: Record<string, string> = {
  standup:       "Stand-up",
  planning:      "Planning",
  review:        "Review",
  retrospective: "Retrospective",
  one_on_one:    "1-on-1",
  general:       "General",
  workshop:      "Workshop",
  client_call:   "Client Call",
};

// ── Colour pool for Yjs cursors (DSM brand and accent palette) ───────────────
const CURSOR_COLORS = [
  "#249E5E", "#2563EB", "#D97706", "#7C3AED", "#16A34A", "#DC2626", "#059669", "#9333EA",
];
export function getCursorColor(index: number): string {
  return CURSOR_COLORS[index % CURSOR_COLORS.length];
}

// ── Misc ──────────────────────────────────────────────────────────────────────
export function initials(name?: string | null): string {
  if (!name || !name.trim()) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

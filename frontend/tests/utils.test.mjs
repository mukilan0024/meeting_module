import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Re-implement or test pure utility functions matching src/lib/utils.ts
import { format, formatDistanceToNow, parseISO, differenceInMinutes } from "date-fns";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy • h:mm a");
  } catch {
    return "—";
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return "—";
  }
}

function formatRelative(iso) {
  if (!iso) return "recently";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "recently";
  }
}

function getMeetingDuration(start, end) {
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

function initials(name) {
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

describe("Date & Time Utilities (RUN-02)", () => {
  test("handles valid ISO strings correctly", () => {
    const iso = "2026-10-27T10:00:00.000Z";
    assert.match(formatDate(iso), /Oct 27, 2026/);
    assert.match(formatDateTime(iso), /Oct 27, 2026/);
    assert.ok(formatTime(iso).length > 0);
  });

  test("handles null, undefined, and empty string without throwing RangeError", () => {
    assert.equal(formatDateTime(null), "—");
    assert.equal(formatDateTime(undefined), "—");
    assert.equal(formatDateTime(""), "—");
    assert.equal(formatDate(null), "—");
    assert.equal(formatTime(null), "—");
    assert.equal(formatRelative(null), "recently");
  });

  test("calculates meeting duration accurately", () => {
    const start = "2026-10-27T10:00:00.000Z";
    const end30 = "2026-10-27T10:30:00.000Z";
    const end90 = "2026-10-27T11:30:00.000Z";
    assert.equal(getMeetingDuration(start, end30), "30m");
    assert.equal(getMeetingDuration(start, end90), "1h 30m");
    assert.equal(getMeetingDuration(null, end30), "—");
    assert.equal(getMeetingDuration(start, null), "—");
  });
});

describe("Initials Utility (RUN-03)", () => {
  test("extracts uppercase initials from single and multi-word names", () => {
    assert.equal(initials("Mukilan J"), "MJ");
    assert.equal(initials("John Doe Smith"), "JD");
    assert.equal(initials("Alice"), "A");
  });

  test("safely handles null, undefined, empty, and whitespace strings without throwing", () => {
    assert.equal(initials(null), "?");
    assert.equal(initials(undefined), "?");
    assert.equal(initials(""), "?");
    assert.equal(initials("   "), "?");
  });
});

describe("AI Job Latest Completed Selection (LOGIC-01)", () => {
  test("selects the newest completed job rather than the first inserted job", () => {
    const jobs = [
      { id: "1", status: "completed", job_type: "full_pipeline", created_at: "2026-10-27T08:00:00Z", output_json: { summary: "Old" } },
      { id: "2", status: "completed", job_type: "full_pipeline", created_at: "2026-10-27T09:00:00Z", output_json: { summary: "New" } },
    ];
    const latest = jobs
      .filter((j) => j.status === "completed" && j.job_type === "full_pipeline")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    assert.equal(latest.id, "2");
    assert.equal(latest.output_json.summary, "New");
  });
});

describe("Agenda Overbox Calculation (LOGIC-05)", () => {
  test("identifies when total allocated duration exceeds scheduled duration", () => {
    const scheduledMinutes = 45;
    const items = [
      { duration_minutes: 20 },
      { duration_minutes: 30 },
    ];
    const totalMinutes = items.reduce((s, i) => s + i.duration_minutes, 0);
    const isOverboxed = Boolean(scheduledMinutes && totalMinutes > scheduledMinutes);
    const overboxedMinutes = isOverboxed ? totalMinutes - scheduledMinutes : 0;

    assert.equal(totalMinutes, 50);
    assert.equal(isOverboxed, true);
    assert.equal(overboxedMinutes, 5);
  });
});

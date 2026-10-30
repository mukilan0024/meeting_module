"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Calendar, Clock, MapPin, Link2, Users, Loader2, AlertCircle } from "lucide-react";
import { meetingsApi } from "@/lib/api";
import type { ConflictResponse } from "@/lib/types";
import { toast } from "sonner";

const MeetingSchema = z
  .object({
    title:             z.string().min(1, "Title is required").max(255),
    description:       z.string().optional(),
    meeting_type:      z.enum(["standup","planning","review","retrospective","one_on_one","general","workshop","client_call"]),
    start_time:        z.string().min(1, "Start time is required"),
    end_time:          z.string().min(1, "End time is required"),
    timezone:          z.string().default("UTC"),
    physical_location: z.string().optional(),
    meeting_url:       z.string().url("Must be a valid URL").optional().or(z.literal("")),
    created_by:        z.string().min(1, "Host is required"),
    project_id:        z.string().optional(),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: "End time must be after start time",
    path: ["end_time"],
  });
type MeetingFormValues = z.infer<typeof MeetingSchema>;

interface MeetingFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultStartTime?: string;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function MeetingFormDialog({ open, onClose, onSuccess, defaultStartTime }: MeetingFormDialogProps) {
  const [conflict, setConflict] = useState<ConflictResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const defaultStart = defaultStartTime ?? toLocalDatetimeString(now);
  const defaultEnd = defaultStartTime
    ? toLocalDatetimeString(new Date(new Date(defaultStartTime).getTime() + 60 * 60 * 1000))
    : toLocalDatetimeString(new Date(now.getTime() + 60 * 60 * 1000));

  const { register, handleSubmit, watch, formState: { errors } } = useForm<MeetingFormValues>({
    resolver: zodResolver(MeetingSchema),
    defaultValues: {
      meeting_type: "general",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      created_by: "user_001",
      start_time: defaultStart,
      end_time: defaultEnd,
    },
  });

  const startTime = watch("start_time");
  const endTime = watch("end_time");

  async function checkConflicts() {
    if (!startTime || !endTime) return;
    try {
      const res = await meetingsApi.checkConflicts({
        created_by: watch("created_by") || "user_001",
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
      setConflict(res.has_conflict ? res : null);
    } catch { /* ignore */ }
  }

  const onSubmit = async (values: MeetingFormValues) => {
    setSubmitting(true);
    try {
      await meetingsApi.create({
        ...values,
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        meeting_url: values.meeting_url || undefined,
      });
      toast.success("Meeting scheduled successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to create meeting");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="meeting-dialog-title">
      <div className="modal-container">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
          <div>
            <h2 id="meeting-dialog-title" className="font-bold text-[#111827] text-[18px]">Schedule New Meeting</h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5">Define agenda, time slot, and meeting coordinates</p>
          </div>
          <button
            id="close-meeting-dialog-btn"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-all"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Form Body */}
        <form id="meeting-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1">Meeting Title *</label>
            <input
              {...register("title")}
              id="meeting-title-input"
              placeholder="e.g. Weekly Governance Review & Sprint Sync"
              className="input-dsm"
            />
            {errors.title && <p className="text-[#DC2626] text-[11px] mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1">Description / Objectives</label>
            <textarea
              {...register("description")}
              id="meeting-desc-input"
              rows={2}
              placeholder="Provide a high-level briefing of the agenda…"
              className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E7EB] rounded-[8px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#249E5E] focus:ring-2 focus:ring-[#249E5E]/10 transition-all resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1">Meeting Type</label>
            <select
              {...register("meeting_type")}
              id="meeting-type-select"
              className="input-dsm"
            >
              {["standup","planning","review","retrospective","one_on_one","general","workshop","client_call"].map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1">
                <Clock className="inline w-3.5 h-3.5 mr-1 text-[#6B7280]" strokeWidth={1.5} />Start Time *
              </label>
              <input
                {...register("start_time")}
                type="datetime-local"
                id="meeting-start-input"
                onBlur={checkConflicts}
                className="input-dsm"
              />
              {errors.start_time && <p className="text-[#DC2626] text-[11px] mt-1">{errors.start_time.message}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1">
                <Clock className="inline w-3.5 h-3.5 mr-1 text-[#6B7280]" strokeWidth={1.5} />End Time *
              </label>
              <input
                {...register("end_time")}
                type="datetime-local"
                id="meeting-end-input"
                onBlur={checkConflicts}
                className="input-dsm"
              />
              {errors.end_time && <p className="text-[#DC2626] text-[11px] mt-1">{errors.end_time.message}</p>}
            </div>
          </div>

          {/* Conflict warning (DSM Warning Alert) */}
          {conflict?.has_conflict && (
            <div className="flex items-start gap-3 p-3.5 rounded-[10px] bg-[#FFFBEB] border border-[#FEF3C7] text-[#D97706]">
              <AlertCircle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="text-[12px]">
                <p className="font-semibold text-[#B45309]">Scheduling Conflict Detected</p>
                <p className="text-[#92400E] mt-0.5">
                  Overlaps with &quot;{conflict.conflicting_meetings[0]?.title}&quot;. The system allows override.
                </p>
              </div>
            </div>
          )}

          {/* Location & URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1">
                <MapPin className="inline w-3.5 h-3.5 mr-1 text-[#6B7280]" strokeWidth={1.5} />Location / Room
              </label>
              <input
                {...register("physical_location")}
                id="meeting-location-input"
                placeholder="e.g. Boardroom 4B"
                className="input-dsm"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1">
                <Link2 className="inline w-3.5 h-3.5 mr-1 text-[#6B7280]" strokeWidth={1.5} />Video Meeting URL
              </label>
              <input
                {...register("meeting_url")}
                id="meeting-url-input"
                placeholder="https://meet.google.com/…"
                className="input-dsm"
              />
              {errors.meeting_url && <p className="text-[#DC2626] text-[11px] mt-1">{errors.meeting_url.message}</p>}
            </div>
          </div>

          {/* Host */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1">
              <Users className="inline w-3.5 h-3.5 mr-1 text-[#6B7280]" strokeWidth={1.5} />Organizer (Host ID) *
            </label>
            <input
              {...register("created_by")}
              id="meeting-host-input"
              placeholder="user_001"
              className="input-dsm"
            />
          </div>
        </form>

        {/* Footer (DSM Modal Footer: bg #F9FAFB, border-t #E5E7EB) */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={onClose}
            className="btn-dsm-neutral h-[36px] px-4 text-[13px]"
          >
            Cancel
          </button>
          <button
            id="submit-meeting-btn"
            type="submit"
            form="meeting-form"
            disabled={submitting}
            className="btn-dsm-primary h-[36px] px-4 text-[13px]"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" strokeWidth={1.5} />}
            <span>{submitting ? "Scheduling…" : "Confirm & Schedule"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  FileSignature, CheckCircle2, Clock, AlertCircle, ShieldCheck, Loader2, KeyRound
} from "lucide-react";
import { momApi, participantsApi, notesApi } from "@/lib/api";
import { cn, initials, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export function MoMSignOffPanel({ meetingId }: { meetingId: string }) {
  const [signing, setSigning] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const { data: statusData, mutate: refreshStatus } = useSWR(
    ["mom-status", meetingId],
    () => momApi.getStatus(meetingId)
  );

  const { data: participantData } = useSWR(
    ["participants", meetingId],
    () => participantsApi.list(meetingId)
  );

  const participants = participantData?.items ?? [];
  const signoffs = statusData?.signoffs ?? [];
  const signedIds = new Set(signoffs.map((s) => s.participant_id));
  const pendingParticipants = participants.filter((p) => !signedIds.has(p.id));
  const allApproved = statusData?.all_approved ?? false;

  const handleSignOff = async (participantId: string, isApproved: boolean) => {
    setSigning(participantId);
    try {
      let noteVersion = 1;
      try {
        const note = await notesApi.get(meetingId, "mom");
        noteVersion = note.version;
      } catch { /* MoM note fallback to 1 */ }

      await momApi.signOff({
        meeting_id: meetingId,
        participant_id: participantId,
        note_version: noteVersion,
        is_approved: isApproved,
        comments: comment.trim() || undefined,
      });

      setComment("");
      refreshStatus();
      toast.success(isApproved ? "MoM ratified and cryptographically signed" : "Formal objection recorded");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to complete sign-off");
    } finally {
      setSigning(null);
    }
  };

  const completionPct = statusData
    ? Math.round((statusData.signed_count / Math.max(1, statusData.total_participants)) * 100)
    : 0;

  return (
    <div className="h-full overflow-y-auto max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 rounded-xl bg-[#E8F7F0] border border-[#249E5E]/20 flex items-center justify-center flex-shrink-0 text-[#177042] shadow-xs">
          {allApproved ? (
            <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
          ) : (
            <FileSignature className="w-5 h-5 stroke-[1.75]" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Minutes of Meeting (MoM) Sign-Off</h2>
          <p className="text-xs text-gray-500">Immutable audit log with SHA-256 cryptographic verification</p>
        </div>
      </div>

      {/* Progress card */}
      {statusData && (
        <div className="mb-6 p-5 rounded-xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-semibold text-gray-800">
              {statusData.signed_count} of {statusData.total_participants} participants signed
            </span>
            <span className="text-sm font-bold text-[#177042]">
              {completionPct}% Complete
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#249E5E] transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {allApproved && (
            <div className="flex items-center gap-2 mt-3.5 p-3 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-xs font-semibold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Full Governance Quorum Reached: All participants have signed off on the official minutes.</span>
            </div>
          )}
        </div>
      )}

      {/* Comment box */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
          Sign-Off Note / Reservation (Optional)
        </label>
        <textarea
          id="mom-comment-input"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="State any clarifications, reservations, or comments before signing…"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#249E5E] focus:ring-2 focus:ring-[#249E5E]/15 transition-all resize-none shadow-xs"
        />
      </div>

      {/* Pending sign-offs */}
      {pendingParticipants.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Awaiting Digital Signature ({pendingParticipants.length})
          </h3>
          <div className="space-y-2">
            {pendingParticipants.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-[#249E5E]/40 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#E8F7F0] text-[#177042] border border-[#249E5E]/20 flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs">
                    {initials(p.user_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.user_name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.user_email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    id={`reject-mom-${p.id}-btn`}
                    onClick={() => handleSignOff(p.id, false)}
                    disabled={signing === p.id}
                    className="btn-dsm-danger text-xs px-3 shadow-2xs"
                  >
                    {signing === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Object"}
                  </button>
                  <button
                    id={`approve-mom-${p.id}-btn`}
                    onClick={() => handleSignOff(p.id, true)}
                    disabled={signing === p.id}
                    className="btn-dsm-primary text-xs px-3.5 flex items-center gap-1.5 shadow-sm"
                  >
                    {signing === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 stroke-[1.75]" />}
                    <span>Approve & Sign</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed sign-offs */}
      {signoffs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Recorded Signatures ({signoffs.length})
          </h3>
          <div className="space-y-2">
            {signoffs.map((s) => {
              const participant = participants.find((p) => p.id === s.participant_id);
              return (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {participant ? initials(participant.user_name) : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{participant?.user_name ?? "Unknown Participant"}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono mt-0.5">
                        <KeyRound className="w-3.5 h-3.5 text-gray-400 stroke-[1.5] flex-shrink-0" />
                        <span className="truncate bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">SHA-256: {s.signature_hash.slice(0, 24)}…</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                    {s.is_approved ? (
                      <span className="badge-dsm bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC] shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> Ratified
                      </span>
                    ) : (
                      <span className="badge-dsm bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] shadow-2xs">
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" /> Objected
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-medium">{formatDateTime(s.signed_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {participants.length === 0 && (
        <div className="empty-state-dsm">
          <Clock className="w-10 h-10 text-gray-300 mb-2 stroke-[1.5]" />
          <h4 className="text-sm font-bold text-gray-900">No participants registered</h4>
          <p className="text-gray-500 text-xs mt-1">Register participants in the Participants tab to enable MoM sign-off workflow.</p>
        </div>
      )}
    </div>
  );
}

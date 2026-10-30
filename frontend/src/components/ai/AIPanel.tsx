"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import {
  Sparkles, Play, Loader2, CheckCircle2, AlertCircle,
  FileText, CheckSquare, Wand2, RefreshCw, Plus, Check,
} from "lucide-react";
import { aiApi, notesApi, actionItemsApi } from "@/lib/api";
import type { AIJob, AIJobType, AIFullPipelineOutput, AIExtractedAction } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";
import { toast } from "sonner";

const JOB_TYPES: { type: AIJobType; label: string; desc: string; icon: React.ElementType }[] = [
  { type: "summarize",       label: "Executive Summary", desc: "Synthesize discussions into decisions and takeaways", icon: FileText },
  { type: "extract_actions", label: "Action Items",      desc: "Automatically detect deliverables and assignees",    icon: CheckSquare },
  { type: "full_pipeline",   label: "Full Governance",   desc: "Complete summary + structured task extraction",       icon: Wand2 },
];

export function AIPanel({ meetingId }: { meetingId: string }) {
  const [selectedType, setSelectedType] = useState<AIJobType>("full_pipeline");
  const [running, setRunning] = useState(false);
  const [activeJob, setActiveJob] = useState<AIJob | null>(null);
  const [acceptingIdx, setAcceptingIdx] = useState<number | null>(null);
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: jobs, mutate: refreshJobs } = useSWR(
    ["ai-jobs", meetingId],
    () => aiApi.listForMeeting(meetingId)
  );

  // Poll active job status
  useEffect(() => {
    if (!activeJob || ["completed", "failed", "cancelled"].includes(activeJob.status)) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const status = await aiApi.pollStatus(activeJob.id);
        if (["completed", "failed", "cancelled"].includes(status.status)) {
          clearInterval(pollRef.current!);
          const full = await aiApi.get(activeJob.id);
          setActiveJob(full);
          refreshJobs();
          if (status.status === "completed") toast.success("AI Governance analysis complete");
          else toast.error(`AI job ${status.status}: ${status.error_message ?? ""}`);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeJob, refreshJobs]);

  const handleRun = async () => {
    setRunning(true);
    try {
      let inputText = "";
      try {
        const note = await notesApi.get(meetingId, "live_notes");
        inputText = note.content_text ?? note.content_html ?? "";
      } catch { /* no note yet */ }

      if (!inputText.trim()) {
        toast.error("No meeting notes found. Please author notes in Live Notes first.");
        return;
      }

      const job = await aiApi.enqueue({ meeting_id: meetingId, job_type: selectedType, input_text: inputText });
      setActiveJob(job);
      refreshJobs();
      toast.info("AI analysis queued — running locally via Ollama…");
    } catch {
      toast.error("Failed to queue AI analysis");
    } finally {
      setRunning(false);
    }
  };

  const handleAcceptActionItem = async (item: AIExtractedAction, idx: number) => {
    setAcceptingIdx(idx);
    try {
      await actionItemsApi.create({
        meeting_id: meetingId,
        title: item.title,
        description: item.description,
        priority: item.priority || "medium",
        due_date: item.due_date ?? undefined,
      });
      setAcceptedIndices((prev) => new Set(prev).add(idx));
      toast.success(`Candidate action item "${item.title}" accepted`);
    } catch {
      toast.error("Failed to accept action item");
    } finally {
      setAcceptingIdx(null);
    }
  };

  // Find latest completed job for selected type by created_at descending
  const latestCompleted = jobs
    ?.filter((j) => j.status === "completed" && j.job_type === selectedType)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const output = latestCompleted?.output_json as AIFullPipelineOutput | undefined;

  const isJobActive = running || activeJob?.status === "processing";

  return (
    <div className="h-full overflow-y-auto max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 rounded-xl bg-[#E8F7F0] border border-[#249E5E]/20 flex items-center justify-center flex-shrink-0 text-[#177042] shadow-xs">
          <Sparkles className="w-5 h-5 stroke-[1.75]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">AI Governance Intelligence</h2>
          <p className="text-xs text-gray-500">Autonomous processing via local Ollama · qwen2.5:7b-instruct</p>
        </div>
      </div>

      {/* Pipeline type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {JOB_TYPES.map(({ type, label, desc, icon: Icon }) => {
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              id={`ai-job-type-${type}-btn`}
              onClick={() => setSelectedType(type)}
              className={cn(
                "p-4 rounded-xl text-left transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]",
                isSelected
                  ? "bg-[#E8F7F0]/60 border-[#249E5E] ring-2 ring-[#249E5E]/20 shadow-xs"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-2.5 stroke-[1.75]", isSelected ? "text-[#177042]" : "text-gray-400")} />
              <p className={cn("text-sm font-bold", isSelected ? "text-gray-900" : "text-gray-700")}>{label}</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{desc}</p>
            </button>
          );
        })}
      </div>

      {/* Action button */}
      <div className="mb-6 space-y-2">
        <button
          id="run-ai-btn"
          onClick={handleRun}
          disabled={isJobActive}
          className="btn-dsm-primary w-full flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm text-sm disabled:opacity-50"
        >
          {isJobActive ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin stroke-[2]" />
              <span>Analyzing meeting discussions with Ollama…</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current stroke-[1.5]" />
              <span>Execute AI Governance Pipeline</span>
            </>
          )}
        </button>

        {isJobActive && (
          <div className="p-3 bg-[#E8F7F0] border border-[#249E5E]/20 rounded-xl text-xs text-[#177042] flex items-center gap-2 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
            <span>Local model inference in progress. Responses are synthesized securely on premises.</span>
          </div>
        )}
      </div>

      {/* Job history */}
      {jobs && jobs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Pipeline Execution History</h3>
          <div className="space-y-1.5">
            {jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  {job.status === "completed" && <CheckCircle2 className="w-4 h-4 text-[#16A34A] stroke-[2]" />}
                  {job.status === "failed" && <AlertCircle className="w-4 h-4 text-red-500 stroke-[2]" />}
                  {job.status === "processing" && <Loader2 className="w-4 h-4 text-[#249E5E] animate-spin stroke-[2]" />}
                  {job.status === "queued" && <RefreshCw className="w-4 h-4 text-gray-400 stroke-[1.5]" />}
                  <span className="font-semibold text-gray-800 capitalize">{job.job_type.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  {job.duration_ms && (
                    <span className="font-medium text-gray-600">{(job.duration_ms / 1000).toFixed(1)}s runtime</span>
                  )}
                  <span>{formatRelative(job.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Output */}
      {output && (
        <div className="space-y-4 fade-in">
          {output.summary && (
            <Section title="Executive Summary">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{output.summary}</p>
            </Section>
          )}

          {output.key_points && output.key_points.length > 0 && (
            <Section title="Key Discussion Points">
              <ul className="space-y-2">
                {output.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#249E5E] flex-shrink-0 mt-2" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {output.decisions_made && output.decisions_made.length > 0 && (
            <Section title="Ratified Decisions">
              <ul className="space-y-2">
                {output.decisions_made.map((d, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-800">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5 stroke-[2]" />
                    <span className="font-semibold">{d}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {output.action_items && output.action_items.length > 0 && (
            <Section title={`Extracted Action Items (${output.action_items.length})`}>
              <div className="space-y-2.5">
                {output.action_items.map((item, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex-shrink-0 shadow-2xs">
                        {item.priority.toUpperCase()}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-gray-200/60 flex-wrap">
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        {item.assignee_name && <span>Assignee: {item.assignee_name}</span>}
                        {item.due_date && <span>Due: {item.due_date}</span>}
                        <span className="text-[#177042] font-semibold bg-[#E8F7F0] px-2 py-0.5 rounded-md border border-[#249E5E]/20">
                          {Math.round(item.confidence_score * 100)}% AI confidence
                        </span>
                      </div>
                      {acceptedIndices.has(i) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#14532D] bg-[#DCFCE7] px-2.5 py-1 rounded-full border border-[#86EFAC] shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Accepted
                        </span>
                      ) : (
                        <button
                          id={`accept-ai-action-${i}-btn`}
                          onClick={() => handleAcceptActionItem(item, i)}
                          disabled={acceptingIdx === i}
                          className="btn-dsm-secondary text-xs py-1.5 px-3 flex items-center gap-1 shadow-2xs"
                          aria-label={`Accept action item: ${item.title}`}
                        >
                          {acceptingIdx === i ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 stroke-[2]" />
                          )}
                          <span>Accept Action Item</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-xs">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

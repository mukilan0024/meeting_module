// All TypeScript interfaces mirroring the Pydantic v2 backend schemas

export type UUID = string;

// ── Enums ─────────────────────────────────────────────────────────────────────

export type MeetingType =
  | "standup" | "planning" | "review" | "retrospective"
  | "one_on_one" | "general" | "workshop" | "client_call";

export type MeetingStatus =
  | "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";

export type ParticipantRole =
  | "organizer" | "presenter" | "attendee" | "optional" | "guest";

export type ParticipantStatus =
  | "pending" | "accepted" | "declined" | "tentative" | "no_response";

export type AgendaItemStatus =
  | "pending" | "in_progress" | "completed" | "skipped" | "deferred";

export type ActionPriority = "low" | "medium" | "high" | "critical";

export type ActionStatus =
  | "open" | "in_progress" | "completed" | "cancelled" | "blocked";

export type NoteType =
  | "live_notes" | "mom" | "transcript" | "ai_summary";

export type AIJobType =
  | "summarize" | "extract_actions" | "full_pipeline" | "sentiment_analysis";

export type AIJobStatus =
  | "queued" | "processing" | "completed" | "failed" | "cancelled";

// ── Core Models ────────────────────────────────────────────────────────────────

export interface Meeting {
  id: UUID;
  title: string;
  description?: string;
  meeting_type: MeetingType;
  status: MeetingStatus;
  start_time: string;   // ISO datetime string
  end_time: string;
  timezone: string;
  recurrence_rule?: string;
  recurrence_parent_id?: UUID;
  physical_location?: string;
  meeting_url?: string;
  conference_id?: string;
  created_by: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: UUID;
  meeting_id: UUID;
  user_id: string;
  user_email: string;
  user_name: string;
  avatar_url?: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  joined_at?: string;
  left_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgendaItem {
  id: UUID;
  meeting_id: UUID;
  title: string;
  description?: string;
  presenter_id?: UUID;
  duration_minutes: number;
  order_index: number;
  status: AgendaItemStatus;
  actual_duration_minutes?: number;
  facilitator_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: UUID;
  meeting_id: UUID;
  agenda_item_id?: UUID;
  title: string;
  description?: string;
  assignee_id?: UUID;
  priority: ActionPriority;
  status: ActionStatus;
  due_date?: string;
  converted_to_task: boolean;
  external_task_id?: string;
  external_task_url?: string;
  source_ai_job_id?: UUID;
  ai_confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: UUID;
  meeting_id: UUID;
  note_type: NoteType;
  content_json?: Record<string, unknown>;
  content_html?: string;
  content_text?: string;
  version: number;
  created_by: string;
  last_edited_by: string;
  created_at: string;
  updated_at: string;
}

export interface MoMSignOff {
  id: UUID;
  meeting_id: UUID;
  participant_id: UUID;
  signed_at: string;
  signature_hash: string;
  note_version: number;
  is_approved: boolean;
  comments?: string;
  pdf_path?: string;
  pdf_generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AIJob {
  id: UUID;
  meeting_id: UUID;
  job_type: AIJobType;
  status: AIJobStatus;
  model_used: string;
  output_json?: Record<string, unknown>;
  error_message?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  duration_ms?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ── API Response Wrappers ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface ListResponse<T> {
  total: number;
  items: T[];
}

export interface ConflictResponse {
  has_conflict: boolean;
  conflicting_meetings: Meeting[];
}

export interface MoMStatusResponse {
  meeting_id: UUID;
  total_participants: number;
  signed_count: number;
  pending_count: number;
  all_approved: boolean;
  signoffs: MoMSignOff[];
}

// ── AI Output Shapes ──────────────────────────────────────────────────────────

export interface AISummaryOutput {
  summary: string;
  key_points: string[];
  decisions_made: string[];
  topics_discussed: string[];
}

export interface AIExtractedAction {
  title: string;
  description: string;
  assignee_name: string | null;
  priority: ActionPriority;
  due_date: string | null;
  confidence_score: number;
}

export interface AIFullPipelineOutput extends AISummaryOutput {
  action_items: AIExtractedAction[];
}

// ── Form Payload Types ─────────────────────────────────────────────────────────

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  meeting_type: MeetingType;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence_rule?: string;
  physical_location?: string;
  meeting_url?: string;
  created_by: string;
  project_id?: string;
}

export interface UpdateMeetingPayload extends Partial<CreateMeetingPayload> {
  status?: MeetingStatus;
}

export interface CreateParticipantPayload {
  meeting_id: UUID;
  user_id: string;
  user_email: string;
  user_name: string;
  role: ParticipantRole;
}

export interface CreateAgendaItemPayload {
  meeting_id: UUID;
  title: string;
  description?: string;
  presenter_id?: UUID;
  duration_minutes: number;
  order_index: number;
}

export interface CreateActionItemPayload {
  meeting_id: UUID;
  agenda_item_id?: UUID;
  title: string;
  description?: string;
  assignee_id?: UUID;
  priority: ActionPriority;
  due_date?: string;
}

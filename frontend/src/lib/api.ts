/**
 * Centralised Axios-based API client.
 * All methods throw on non-2xx responses; callers use try/catch.
 */
import axios, { AxiosInstance, AxiosResponse } from "axios";
import type {
  Meeting, Participant, AgendaItem, ActionItem,
  MeetingNote, MoMSignOff, AIJob,
  PaginatedResponse, ListResponse, ConflictResponse, MoMStatusResponse,
  CreateMeetingPayload, UpdateMeetingPayload, CreateParticipantPayload,
  CreateAgendaItemPayload, CreateActionItemPayload,
  MeetingStatus, ActionPriority, ActionStatus, NoteType, AIJobType,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const http: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// ── Generic helper ────────────────────────────────────────────────────────────
async function req<T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> {
  const res = await fn();
  return res.data;
}

// ── Meetings ──────────────────────────────────────────────────────────────────
export const meetingsApi = {
  list: (params?: {
    created_by?: string; project_id?: string; status?: MeetingStatus;
    start_after?: string; start_before?: string;
    page?: number; page_size?: number;
  }) => req(() => http.get<PaginatedResponse<Meeting>>("/meetings", { params })),

  get: (id: string) =>
    req(() => http.get<Meeting>(`/meetings/${id}`)),

  create: (data: CreateMeetingPayload) =>
    req(() => http.post<Meeting>("/meetings", data)),

  update: (id: string, data: UpdateMeetingPayload) =>
    req(() => http.patch<Meeting>(`/meetings/${id}`, data)),

  delete: (id: string) =>
    req(() => http.delete<void>(`/meetings/${id}`)),

  checkConflicts: (params: { created_by: string; start_time: string; end_time: string; exclude_meeting_id?: string }) =>
    req(() => http.post<ConflictResponse>("/meetings/conflicts/check", null, { params })),
};

// ── Participants ──────────────────────────────────────────────────────────────
export const participantsApi = {
  list: (meetingId: string) =>
    req(() => http.get<ListResponse<Participant>>(`/participants/meeting/${meetingId}`)),

  add: (data: CreateParticipantPayload) =>
    req(() => http.post<Participant>("/participants", data)),

  update: (id: string, data: { role?: string; status?: string }) =>
    req(() => http.patch<Participant>(`/participants/${id}`, data)),

  updateAttendance: (id: string, data: { joined_at?: string; left_at?: string }) =>
    req(() => http.patch<Participant>(`/participants/${id}/attendance`, data)),

  remove: (id: string) =>
    req(() => http.delete<void>(`/participants/${id}`)),
};

// ── Agenda ────────────────────────────────────────────────────────────────────
export const agendaApi = {
  list: (meetingId: string) =>
    req(() => http.get<ListResponse<AgendaItem>>(`/agenda/meeting/${meetingId}`)),

  create: (data: CreateAgendaItemPayload) =>
    req(() => http.post<AgendaItem>("/agenda", data)),

  update: (id: string, data: Partial<AgendaItem>) =>
    req(() => http.patch<AgendaItem>(`/agenda/${id}`, data)),

  delete: (id: string) =>
    req(() => http.delete<void>(`/agenda/${id}`)),

  reorder: (meetingId: string, ordered_ids: string[]) =>
    req(() => http.put<ListResponse<AgendaItem>>(`/agenda/meeting/${meetingId}/reorder`, { ordered_ids })),
};

// ── Action Items ──────────────────────────────────────────────────────────────
export const actionItemsApi = {
  list: (meetingId: string, params?: { assignee_id?: string; status?: ActionStatus; converted_only?: boolean }) =>
    req(() => http.get<ListResponse<ActionItem>>(`/action-items/meeting/${meetingId}`, { params })),

  create: (data: CreateActionItemPayload) =>
    req(() => http.post<ActionItem>("/action-items", data)),

  update: (id: string, data: Partial<ActionItem>) =>
    req(() => http.patch<ActionItem>(`/action-items/${id}`, data)),

  delete: (id: string) =>
    req(() => http.delete<void>(`/action-items/${id}`)),

  convertToTask: (id: string, data: { external_task_id: string; external_task_url?: string }) =>
    req(() => http.post<ActionItem>(`/action-items/${id}/convert-to-task`, data)),
};

// ── Notes ─────────────────────────────────────────────────────────────────────
export const notesApi = {
  getOrCreate: (data: { meeting_id: string; note_type: NoteType; created_by: string; last_edited_by: string }) =>
    req(() => http.post<MeetingNote>("/notes", data)),

  get: (meetingId: string, noteType: NoteType) =>
    req(() => http.get<MeetingNote>(`/notes/meeting/${meetingId}/${noteType}`)),

  update: (id: string, data: { content_json?: object; content_html?: string; content_text?: string; last_edited_by: string; version: number }) =>
    req(() => http.patch<MeetingNote>(`/notes/${id}`, data)),
};

// ── MoM Sign-off ──────────────────────────────────────────────────────────────
export const momApi = {
  signOff: (data: { meeting_id: string; participant_id: string; note_version: number; is_approved: boolean; comments?: string }) =>
    req(() => http.post<MoMSignOff>("/mom/signoff", data)),

  getStatus: (meetingId: string) =>
    req(() => http.get<MoMStatusResponse>(`/mom/meeting/${meetingId}/status`)),
};

// ── AI Jobs ───────────────────────────────────────────────────────────────────
export const aiApi = {
  enqueue: (data: { meeting_id: string; job_type: AIJobType; input_text: string }) =>
    req(() => http.post<AIJob>("/ai/jobs", data)),

  get: (id: string) =>
    req(() => http.get<AIJob>(`/ai/jobs/${id}`)),

  pollStatus: (id: string) =>
    req(() => http.get<{ id: string; status: string; duration_ms?: number; error_message?: string }>(`/ai/jobs/${id}/status`)),

  listForMeeting: (meetingId: string) =>
    req(() => http.get<AIJob[]>(`/ai/jobs/meeting/${meetingId}`)),
};

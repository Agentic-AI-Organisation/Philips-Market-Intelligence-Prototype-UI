export type FrequencyType = "daily" | "weekly" | "monthly" | "custom_interval"
export type LastRunStatus = "dispatched" | "dispatch_failed" | null

export interface ScheduleConfig {
  id: number
  account_id: string
  research_group_id: string
  is_enabled: boolean
  frequency_type: FrequencyType
  days_of_week: string | null
  day_of_month: number | null
  interval_days: number | null
  time_of_day: string
  timezone: string
  next_run_at: string | null
  last_triggered_at: string | null
  last_run_id: string | null
  last_run_status: LastRunStatus
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

export interface CreateSchedulePayload {
  account_id: string
  research_group_id: string
  frequency_type: FrequencyType
  days_of_week?: string | null
  day_of_month?: number | null
  interval_days?: number | null
  time_of_day: string
  timezone: string
}

export type BulkCreateSchedulePayload = Omit<CreateSchedulePayload, "account_id"> & {
  account_ids: string[]
}

export type BulkItemStatus = "created" | "conflict" | "account_not_found"

export interface BulkCreateItemResult {
  account_id: string
  status: BulkItemStatus
  schedule: ScheduleConfig | null
  reason: string | null
}

export interface BulkCreateResponse {
  requested: number
  created: number
  results: BulkCreateItemResult[]
}

export type ScheduleCoverage = Record<string, string[]>

export type UpdateSchedulePayload = Partial<
  Omit<CreateSchedulePayload, "account_id" | "research_group_id">
>

export type StatusFilter = "enabled" | "paused" | "all"

export interface ListSchedulesParams {
  account_id?: string
  research_group_id?: string
  status: StatusFilter
  limit: number
  offset: number
}

export interface Account {
  account_id: string
  hospital_name: string
  location: {
    city: string | null
    region: string | null
    country: string | null
  }
}

export const MODELS = ["gpt-5.2", "gpt-5.4", "gpt-5.5", "gpt-5.6-luna"] as const
export const EFFORTS = ["low", "medium", "high"] as const
export type ModelName = (typeof MODELS)[number]
export type Effort = (typeof EFFORTS)[number]

export interface ResearchAreaModelConfig {
  research_group_id: string
  name: string
  model: ModelName
  effort: Effort
  updated_at: string
}

export type TriggerType = "on_demand" | "scheduled"

export type JobStatus = "queued" | "processing" | "in_progress" | "completed" | "failed" | "dead_letter"

export interface RunHistoryJob {
  job_id: string
  account_id: string
  research_group_id: string
  trigger_type: TriggerType
  triggered_by: string
  status: JobStatus
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

export interface ListRunHistoryParams {
  trigger_type?: TriggerType
  days?: number
  account_id?: string
  research_group_id?: string
  limit: number
  offset: number
}

// --- Account intelligence (research output + chat) -----------------------

export interface GroupOutputEntry {
  data: Record<string, unknown>
  generated_at: string | null
}

export interface ActiveSignal {
  text: string
  date: string | null
  topic?: string | null
  title?: string | null
}

export interface GroupSummaryEntry {
  summary: string
  active_signals: ActiveSignal[]
  generated_at: string | null
}

export interface RunState {
  last_run_timestamp: string | null
  last_run_status: string | null
}

export interface TriggerRunResult {
  run_id: string
  status: string
  already_running: boolean
}

export interface ChatCitation {
  url: string
  date: string
  source: string
}

export interface ChatSource {
  index: number
  title: string
  citations: ChatCitation[]
  research_group: string
  sub_requirement: string
  recency: string
}

export interface ChatResponse {
  answer: string
  sources: ChatSource[]
}

// --- Prompts (system prompts, quick prompts, saved prompts) --------------
// Replaces the old per-account quick_prompts concept — prompts are global,
// not account-scoped (the same prompt library applies everywhere), and
// is_quick_prompt elevates up to 3 of them to the chat widget's empty-state
// chips. Greenfield — no existing table/endpoint to migrate from.

export interface SystemPrompt {
  id: number
  name: string
  prompt_text: string
  is_quick_prompt: boolean
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

export interface SavedPrompt {
  id: number
  user_id: string
  name: string
  prompt_text: string
  created_at: string
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

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

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

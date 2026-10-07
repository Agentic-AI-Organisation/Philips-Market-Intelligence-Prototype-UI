import { computeNextRunAt } from "./schedule-time"
import {
  ApiError,
  EFFORTS,
  MODELS,
  type Account,
  type BulkCreateItemResult,
  type BulkCreateResponse,
  type BulkCreateSchedulePayload,
  type CreateSchedulePayload,
  type JobStatus,
  type ListRunHistoryParams,
  type ListSchedulesParams,
  type ResearchAreaModelConfig,
  type RunHistoryJob,
  type ScheduleConfig,
  type ScheduleCoverage,
  type TriggerType,
  type UpdateSchedulePayload,
} from "./types"

/**
 * In-memory stand-in for research-api. Function names map 1:1 to endpoints so they can be
 * swapped for axiosInstance calls:
 *   GET    /accounts                               -> listAccounts
 *   GET    /schedule-config                        -> listSchedules
 *   GET    /schedule-config/coverage               -> getScheduleCoverage (enabled account_ids per research area)
 *   POST   /schedule-config                        -> createSchedule
 *   POST   /schedule-config/bulk                   -> createSchedulesBulk (one row per account; skips accounts already enabled)
 *   PATCH  /schedule-config/{id}                   -> updateSchedule
 *   PATCH  /schedule-config/{id}/enable            -> enableSchedule
 *   PATCH  /schedule-config/{id}/disable           -> disableSchedule
 *   GET    /research-areas/model-config            -> listModelConfig
 *   PATCH  /research-areas/{id}/model-config       -> updateModelConfig
 */

const CURRENT_USER = "sinan.abbas@philips.com"
let hasAdminRole = true

export function setMockAdminRole(value: boolean) {
  hasAdminRole = value
}

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

async function adminRequest<T>(fn: () => T): Promise<T> {
  await delay()
  if (!hasAdminRole) throw new ApiError(401, "Missing required role: research.admin")
  return structuredClone(fn())
}

const northAmerica = { city: null, region: "North America", country: null }
const europe = { city: null, region: "Europe", country: null }

const accounts: Account[] = [
  { account_id: "Acc_001", hospital_name: "HCA", location: northAmerica },
  { account_id: "Acc_002", hospital_name: "Sanford Health", location: northAmerica },
  { account_id: "Acc_003", hospital_name: "Baylor Scott & White Health", location: northAmerica },
  { account_id: "Acc_004", hospital_name: "CommonSpirit Health", location: northAmerica },
  { account_id: "Acc_005", hospital_name: "Ascension", location: northAmerica },
  { account_id: "Acc_006", hospital_name: "Trinity Health", location: northAmerica },
  { account_id: "Acc_007", hospital_name: "Providence", location: northAmerica },
  { account_id: "Acc_008", hospital_name: "Intermountain Health", location: northAmerica },
  { account_id: "Acc_009", hospital_name: "Atrium Health", location: northAmerica },
  { account_id: "Acc_010", hospital_name: "Mayo Clinic", location: northAmerica },
  { account_id: "Acc_011", hospital_name: "Guy's and St Thomas' NHS Foundation Trust", location: europe },
  { account_id: "Acc_012", hospital_name: "Charité – Universitätsmedizin Berlin", location: europe },
  ...generateAccounts(2088, 13),
]

function generateAccounts(count: number, startId: number): Account[] {
  const cities: [string, string][] = [
    ["Austin", "North America"], ["Boston", "North America"], ["Denver", "North America"],
    ["Phoenix", "North America"], ["Seattle", "North America"], ["Atlanta", "North America"],
    ["Omaha", "North America"], ["Tampa", "North America"], ["Toronto", "North America"],
    ["Portland", "North America"], ["Nashville", "North America"], ["Raleigh", "North America"],
    ["Madison", "North America"], ["Tucson", "North America"], ["Vancouver", "North America"],
    ["Richmond", "North America"], ["Cleveland", "North America"], ["Sacramento", "North America"],
    ["Lyon", "Europe"], ["Munich", "Europe"], ["Leeds", "Europe"], ["Utrecht", "Europe"],
    ["Milan", "Europe"], ["Vienna", "Europe"], ["Porto", "Europe"], ["Gothenburg", "Europe"],
    ["Zurich", "Europe"], ["Dublin", "Europe"], ["Krakow", "Europe"], ["Antwerp", "Europe"],
    ["Osaka", "Asia Pacific"], ["Melbourne", "Asia Pacific"], ["Auckland", "Asia Pacific"],
    ["Singapore", "Asia Pacific"], ["Busan", "Asia Pacific"], ["Perth", "Asia Pacific"],
    ["Bogotá", "Latin America"], ["Monterrey", "Latin America"], ["Santiago", "Latin America"],
    ["Curitiba", "Latin America"], ["Lima", "Latin America"], ["Rosario", "Latin America"],
  ]
  const prefixes = ["", "St. Luke's ", "Mercy ", "Memorial ", "Unity ", "Sacred Heart ", "Riverside "]
  const types = [
    "Regional Medical Center", "Health System", "Community Hospital", "University Hospital",
    "Children's Hospital", "General Hospital", "Heart Institute", "Cancer Center",
    "Specialty Clinic", "Rehabilitation Hospital", "Women's Hospital", "Health Partners",
  ]
  const regionLocation = (region: string) => ({ city: null, region, country: null })
  return Array.from({ length: count }, (_, i) => {
    const [city, region] = cities[i % cities.length]
    const type = types[Math.floor(i / cities.length) % types.length]
    const prefix = prefixes[Math.floor(i / (cities.length * types.length)) % prefixes.length]
    return {
      account_id: `Acc_${String(startId + i).padStart(4, "0")}`,
      hospital_name: `${prefix}${city} ${type}`,
      location: regionLocation(region),
    }
  })
}

const modelConfigs: ResearchAreaModelConfig[] = [
  { research_group_id: "RG_001", name: "news_signals", model: "gpt-5.4", effort: "high", updated_at: "2026-09-20T00:00:00Z" },
  { research_group_id: "RG_002", name: "organizational_profile", model: "gpt-5.5", effort: "medium", updated_at: "2026-09-12T08:30:00Z" },
  { research_group_id: "RG_003", name: "growth_and_corporate_events", model: "gpt-5.4", effort: "medium", updated_at: "2026-09-02T14:10:00Z" },
  { research_group_id: "RG_004", name: "vendor_regulatory_and_clinical_context", model: "gpt-5.2", effort: "low", updated_at: "2026-08-28T09:45:00Z" },
]

type Seed = Pick<
  ScheduleConfig,
  "account_id" | "research_group_id" | "is_enabled" | "frequency_type" | "time_of_day" | "timezone"
> &
  Partial<ScheduleConfig>

const seeds: Seed[] = [
  { account_id: "Acc_001", research_group_id: "RG_001", is_enabled: true, frequency_type: "weekly", days_of_week: "monday,thursday", time_of_day: "06:00:00", timezone: "America/New_York", last_triggered_at: "2026-09-28T10:00:00Z", last_run_status: "dispatched" },
  { account_id: "Acc_002", research_group_id: "RG_001", is_enabled: true, frequency_type: "daily", time_of_day: "07:30:00", timezone: "America/Chicago", last_triggered_at: "2026-09-29T12:30:00Z", last_run_status: "dispatched" },
  { account_id: "Acc_002", research_group_id: "RG_001", is_enabled: false, frequency_type: "weekly", days_of_week: "friday", time_of_day: "09:00:00", timezone: "America/Chicago", last_triggered_at: "2026-07-24T14:00:00Z", last_run_status: "dispatched", created_at: "2026-05-01T00:00:00Z" },
  { account_id: "Acc_002", research_group_id: "RG_002", is_enabled: true, frequency_type: "monthly", day_of_month: 1, time_of_day: "05:00:00", timezone: "America/Chicago", last_triggered_at: "2026-09-01T10:00:00Z", last_run_status: "dispatched" },
  { account_id: "Acc_003", research_group_id: "RG_003", is_enabled: true, frequency_type: "custom_interval", interval_days: 10, time_of_day: "06:00:00", timezone: "America/Chicago", last_triggered_at: "2026-09-21T11:00:00Z", last_run_status: "dispatch_failed" },
  { account_id: "Acc_004", research_group_id: "RG_001", is_enabled: true, frequency_type: "weekly", days_of_week: "monday,wednesday,friday", time_of_day: "08:00:00", timezone: "America/Los_Angeles", last_triggered_at: "2026-09-28T15:00:00Z", last_run_status: "dispatched" },
  { account_id: "Acc_005", research_group_id: "RG_004", is_enabled: false, frequency_type: "monthly", day_of_month: 15, time_of_day: "06:00:00", timezone: "America/Chicago", last_triggered_at: "2026-08-15T11:00:00Z", last_run_status: "dispatch_failed" },
  { account_id: "Acc_006", research_group_id: "RG_002", is_enabled: true, frequency_type: "monthly", day_of_month: 28, time_of_day: "22:00:00", timezone: "America/Detroit", last_triggered_at: null, last_run_status: null },
  { account_id: "Acc_007", research_group_id: "RG_001", is_enabled: true, frequency_type: "daily", time_of_day: "06:00:00", timezone: "America/Los_Angeles", last_triggered_at: "2026-09-29T13:00:00Z", last_run_status: "dispatched" },
  { account_id: "Acc_010", research_group_id: "RG_003", is_enabled: true, frequency_type: "weekly", days_of_week: "tuesday", time_of_day: "07:00:00", timezone: "America/Chicago", last_triggered_at: "2026-09-29T12:00:00Z", last_run_status: "dispatched" },
  { account_id: "Acc_011", research_group_id: "RG_001", is_enabled: true, frequency_type: "weekly", days_of_week: "monday,thursday", time_of_day: "09:00:00", timezone: "Europe/London", last_triggered_at: "2026-09-28T08:00:00Z", last_run_status: "dispatched" },
  { account_id: "Acc_012", research_group_id: "RG_004", is_enabled: false, frequency_type: "custom_interval", interval_days: 14, time_of_day: "06:30:00", timezone: "Europe/Berlin", last_triggered_at: "2026-09-01T04:30:00Z", last_run_status: "dispatched" },
  ...accounts.slice(12, 412).map<Seed>((a) => ({ account_id: a.account_id, research_group_id: "RG_001", is_enabled: true, frequency_type: "weekly", days_of_week: "monday", time_of_day: "06:00:00", timezone: "America/New_York", last_triggered_at: "2026-09-28T10:00:00Z", last_run_status: "dispatched" })),
  ...accounts.slice(12, 162).map<Seed>((a) => ({ account_id: a.account_id, research_group_id: "RG_002", is_enabled: true, frequency_type: "monthly", day_of_month: 1, time_of_day: "05:00:00", timezone: "America/Chicago", last_triggered_at: "2026-09-01T10:00:00Z", last_run_status: "dispatched" })),
]

let nextId = 40
const schedules: ScheduleConfig[] = seeds.map((seed) => {
  const row: ScheduleConfig = {
    id: nextId++,
    days_of_week: null,
    day_of_month: null,
    interval_days: null,
    next_run_at: null,
    last_triggered_at: null,
    last_run_id: null,
    last_run_status: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-09-20T09:12:00Z",
    created_by: "admin@philips.com",
    updated_by: "admin@philips.com",
    ...seed,
  }
  row.last_run_id = row.last_triggered_at ? crypto.randomUUID() : null
  row.next_run_at = row.is_enabled ? computeNextRunAt(row)?.toISOString() ?? null : null
  return row
})

function validateCadence(row: Pick<ScheduleConfig, "frequency_type" | "days_of_week" | "day_of_month" | "interval_days">) {
  switch (row.frequency_type) {
    case "weekly":
      if (!row.days_of_week) throw new ApiError(422, "days_of_week is required for weekly schedules")
      break
    case "monthly":
      if (!row.day_of_month || row.day_of_month < 1 || row.day_of_month > 28)
        throw new ApiError(422, "day_of_month must be between 1 and 28")
      break
    case "custom_interval":
      if (!row.interval_days || row.interval_days < 1)
        throw new ApiError(422, "interval_days must be greater than 0")
      break
  }
}

function findSchedule(id: number) {
  const row = schedules.find((s) => s.id === id)
  if (!row) throw new ApiError(404, `Schedule ${id} not found`)
  return row
}

function hasOtherEnabled(accountId: string, researchGroupId: string, excludeId?: number) {
  return schedules.some(
    (s) =>
      s.is_enabled &&
      s.account_id === accountId &&
      s.research_group_id === researchGroupId &&
      s.id !== excludeId,
  )
}

const CONFLICT_MESSAGE =
  "An enabled schedule already exists for this account and research area."

export function listAccounts() {
  return delay(200).then(() => structuredClone(accounts))
}

export function listSchedules(params: ListSchedulesParams) {
  return adminRequest(() =>
    schedules
      .filter((s) => !params.account_id || s.account_id === params.account_id)
      .filter((s) => !params.research_group_id || s.research_group_id === params.research_group_id)
      .filter((s) =>
        params.status === "all" ? true : params.status === "enabled" ? s.is_enabled : !s.is_enabled,
      )
      .sort((a, b) => b.id - a.id)
      .slice(params.offset, params.offset + Math.min(params.limit, 500)),
  )
}

function buildRow(payload: CreateSchedulePayload, now: string): ScheduleConfig {
  const row: ScheduleConfig = {
      id: nextId++,
      account_id: payload.account_id,
      research_group_id: payload.research_group_id,
      is_enabled: true,
      frequency_type: payload.frequency_type,
      days_of_week: payload.frequency_type === "weekly" ? payload.days_of_week ?? null : null,
      day_of_month: payload.frequency_type === "monthly" ? payload.day_of_month ?? null : null,
      interval_days: payload.frequency_type === "custom_interval" ? payload.interval_days ?? null : null,
      time_of_day: payload.time_of_day || "06:00:00",
      timezone: payload.timezone || "UTC",
      next_run_at: null,
      last_triggered_at: null,
      last_run_id: null,
      last_run_status: null,
      created_at: now,
      updated_at: now,
      created_by: CURRENT_USER,
      updated_by: CURRENT_USER,
    }
  validateCadence(row)
  row.next_run_at = computeNextRunAt(row)?.toISOString() ?? null
  return row
}

export function createSchedule(payload: CreateSchedulePayload) {
  return adminRequest(() => {
    if (hasOtherEnabled(payload.account_id, payload.research_group_id))
      throw new ApiError(409, CONFLICT_MESSAGE)
    const row = buildRow(payload, new Date().toISOString())
    schedules.push(row)
    return row
  })
}

export function getScheduleCoverage() {
  return adminRequest(() => {
    const coverage: ScheduleCoverage = {}
    for (const area of modelConfigs) coverage[area.research_group_id] = []
    for (const s of schedules) {
      if (s.is_enabled) (coverage[s.research_group_id] ??= []).push(s.account_id)
    }
    return coverage
  })
}

const accountIds = new Set(accounts.map((a) => a.account_id))

export function createSchedulesBulk(payload: BulkCreateSchedulePayload) {
  return adminRequest((): BulkCreateResponse => {
    if (payload.account_ids.length === 0) throw new ApiError(422, "account_ids must not be empty")
    const { account_ids, ...shared } = payload
    const now = new Date().toISOString()
    const results: BulkCreateItemResult[] = []
    for (const account_id of new Set(account_ids)) {
      if (!accountIds.has(account_id)) {
        results.push({
          account_id,
          status: "account_not_found",
          schedule: null,
          reason: `Account ${account_id} not found`,
        })
        continue
      }
      if (hasOtherEnabled(account_id, shared.research_group_id)) {
        results.push({ account_id, status: "conflict", schedule: null, reason: CONFLICT_MESSAGE })
        continue
      }
      const row = buildRow({ ...shared, account_id }, now)
      schedules.push(row)
      results.push({ account_id, status: "created", schedule: row, reason: null })
    }
    return {
      requested: results.length,
      created: results.filter((r) => r.status === "created").length,
      results,
    }
  })
}

export function updateSchedule(id: number, payload: UpdateSchedulePayload) {
  return adminRequest(() => {
    const row = findSchedule(id)
    if (Object.keys(payload).length === 0) return row
    const updated: ScheduleConfig = { ...row, ...payload }
    validateCadence(updated)
    updated.updated_at = new Date().toISOString()
    updated.updated_by = CURRENT_USER
    updated.next_run_at = updated.is_enabled ? computeNextRunAt(updated)?.toISOString() ?? null : null
    Object.assign(row, updated)
    return row
  })
}

export function enableSchedule(id: number) {
  return adminRequest(() => {
    const row = findSchedule(id)
    if (row.is_enabled) return row
    if (hasOtherEnabled(row.account_id, row.research_group_id, row.id))
      throw new ApiError(409, CONFLICT_MESSAGE)
    row.is_enabled = true
    row.next_run_at = computeNextRunAt(row)?.toISOString() ?? null
    row.updated_at = new Date().toISOString()
    row.updated_by = CURRENT_USER
    return row
  })
}

export function disableSchedule(id: number) {
  return adminRequest(() => {
    const row = findSchedule(id)
    if (!row.is_enabled) return row
    row.is_enabled = false
    row.next_run_at = null
    row.updated_at = new Date().toISOString()
    row.updated_by = CURRENT_USER
    return row
  })
}

export function listModelConfig() {
  return adminRequest(() => modelConfigs)
}

export function updateModelConfig(
  researchAreaId: string,
  payload: Partial<Pick<ResearchAreaModelConfig, "model" | "effort">>,
) {
  return adminRequest(() => {
    const row = modelConfigs.find((m) => m.research_group_id === researchAreaId)
    if (!row) throw new ApiError(404, `Research area ${researchAreaId} not found`)
    if (Object.keys(payload).length === 0) return row
    if (payload.model && !MODELS.includes(payload.model)) throw new ApiError(422, "Unsupported model")
    if (payload.effort && !EFFORTS.includes(payload.effort)) throw new ApiError(422, "Unsupported effort")
    Object.assign(row, payload, { updated_at: new Date().toISOString() })
    return row
  })
}

// --- Run history (GET /run-history — job-service's own Jobs table) -------
// Mirrors real job-service status lifecycle: queued -> processing ->
// in_progress -> completed | failed, plus the rare dead_letter (never even
// published). Reuses existing schedule (account, research area) pairs for
// most rows — matching real life, where most runs are scheduled dispatches
// — with a smaller slice of pure on-demand rows against random accounts.

const ERROR_MESSAGES = [
  "Upstream research-agent timeout after 3 retries",
  "Model provider returned a 503 for this request",
  "No output returned by research-agent",
  "Research-agent reported an unhandled exception",
  "Request exceeded the configured timeout",
]

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickWeighted<T>(weights: [T, number][]): T {
  const total = weights.reduce((sum, [, w]) => sum + w, 0)
  let r = Math.random() * total
  for (const [value, w] of weights) {
    if (r < w) return value
    r -= w
  }
  return weights[0][0]
}

const JOB_STATUS_WEIGHTS: [JobStatus, number][] = [
  ["completed", 70],
  ["failed", 12],
  ["queued", 6],
  ["processing", 5],
  ["in_progress", 4],
  ["dead_letter", 3],
]

function generateRunHistory(count: number): RunHistoryJob[] {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const scheduledPairs = schedules.map((s) => ({
    account_id: s.account_id,
    research_group_id: s.research_group_id,
  }))
  const areaIds = modelConfigs.map((m) => m.research_group_id)

  const jobs: RunHistoryJob[] = []
  for (let i = 0; i < count; i++) {
    const useSchedulePair = scheduledPairs.length > 0 && Math.random() < 0.7
    const pair = useSchedulePair
      ? scheduledPairs[randomInt(0, scheduledPairs.length - 1)]
      : {
          account_id: accounts[randomInt(0, accounts.length - 1)].account_id,
          research_group_id: areaIds[randomInt(0, areaIds.length - 1)],
        }
    const trigger_type: TriggerType = useSchedulePair && Math.random() < 0.85 ? "scheduled" : "on_demand"
    const status = pickWeighted(JOB_STATUS_WEIGHTS)
    const createdAtMs = now - randomInt(0, 45 * day)
    const hasStarted = status !== "queued" && status !== "dead_letter"
    const startedAtMs = hasStarted ? createdAtMs + randomInt(1, 10) * 1000 : null
    const isTerminal = status === "completed" || status === "failed"
    const completedAtMs = isTerminal && startedAtMs ? startedAtMs + randomInt(5, 280) * 1000 : null

    jobs.push({
      job_id: crypto.randomUUID(),
      account_id: pair.account_id,
      research_group_id: pair.research_group_id,
      trigger_type,
      triggered_by: trigger_type === "scheduled" ? "scheduler" : CURRENT_USER,
      status,
      created_at: new Date(createdAtMs).toISOString(),
      started_at: startedAtMs ? new Date(startedAtMs).toISOString() : null,
      completed_at: completedAtMs ? new Date(completedAtMs).toISOString() : null,
      error_message:
        status === "failed" || status === "dead_letter"
          ? ERROR_MESSAGES[randomInt(0, ERROR_MESSAGES.length - 1)]
          : null,
    })
  }
  return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

const runHistoryJobs: RunHistoryJob[] = generateRunHistory(600)

export function listRunHistory(params: ListRunHistoryParams) {
  return adminRequest(() => {
    const sinceMs = params.days ? Date.now() - params.days * 24 * 60 * 60 * 1000 : undefined
    return runHistoryJobs
      .filter((j) => !params.trigger_type || j.trigger_type === params.trigger_type)
      .filter((j) => sinceMs === undefined || new Date(j.created_at).getTime() >= sinceMs)
      .filter((j) => !params.account_id || j.account_id === params.account_id)
      .filter((j) => !params.research_group_id || j.research_group_id === params.research_group_id)
      .slice(params.offset, params.offset + Math.min(params.limit, 500))
  })
}

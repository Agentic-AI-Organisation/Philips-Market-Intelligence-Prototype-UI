import { getMockAccounts } from "./mock-api"
import type { AccountSignal, AccountsPage } from "./types"

// Mock equivalents of GET /accounts (limit/offset/search, server order) and
// GET /account-signals (?account_id= repeated). Kept out of mock-api.ts.

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

type Seed = [accountId: string, title: string, output: string, updatedAt: string]

const PROMPTS: Record<string, string> = {
  "C-Suite Change": "Identify recent executive appointments or departures at this account and what they imply for purchasing priorities.",
  "New Acquisition": "Identify recent acquisitions, mergers or affiliations involving this account.",
  "New Construction Site": "Identify new facilities, expansions or construction projects announced by this account.",
  "Technology Partnership": "Identify new technology, vendor or digital-health partnerships announced by this account.",
}

const seeds: Seed[] = [
  ["Acc_001", "C-Suite Change", "Dr. Michael Schlosser was named Chief Clinical Officer and a new ambulatory operations group was created, indicating strategic shifts in clinical leadership and ambulatory strategy that could influence procurement priorities across care delivery models.", "2026-08-06T09:00:00Z"],
  ["Acc_001", "C-Suite Change", "Erica Rossitto was promoted to Chief Nurse Executive, highlighting potential new investment in nursing workflows, staffing solutions and clinical support tools across HCA's 100,000-strong nursing workforce.", "2026-01-15T09:00:00Z"],
  ["Acc_001", "New Acquisition", "HCA acquired the College of Health Care Professions, expanding its ability to train and recruit allied health professionals and strengthening its workforce pipeline in Texas.", "2026-05-27T09:00:00Z"],
  ["Acc_001", "New Construction Site", "HCA Florida Ocala Hospital announced a $200M expansion adding inpatient capacity, ICU beds and surgical services, signaling opportunities in medical equipment, clinical infrastructure and IT.", "2026-04-10T09:00:00Z"],
  ["Acc_001", "Technology Partnership", "HCA announced an expanded partnership with a major cloud provider to deploy AI-assisted clinical documentation across its hospitals.", "2026-06-18T09:00:00Z"],
  ["Acc_002", "New Acquisition", "Sanford's planned combination with North Memorial Health will create a subsidiary regional structure, signaling potential new demand for system-wide standardization and enterprise technology consolidation in the Twin Cities metro.", "2026-05-08T09:00:00Z"],
  ["Acc_002", "New Acquisition", "The Sanford and Prairie Lakes combination expands Sanford's regional footprint and may drive vendor standardization across the newly integrated sites.", "2025-11-14T09:00:00Z"],
  ["Acc_002", "New Acquisition", "Sanford is merging with Lewis Drug, adding retail pharmacy capabilities to its enterprise platform.", "2025-08-28T09:00:00Z"],
  ["Acc_002", "New Construction Site", "A 9,000 sq. ft. outpatient clinic is planned in Hawley, MN, signaling opportunities for ambulatory-focused technologies and equipment.", "2026-02-03T09:00:00Z"],
  ["Acc_002", "New Construction Site", "The $500M Black Hills Medical Center in Rapid City signals significant upcoming procurement opportunities for construction, specialty equipment and IT infrastructure.", "2025-11-19T09:00:00Z"],
  ["Acc_002", "C-Suite Change", "Sanford created a Chief Transformation Officer role, elevating its focus on AI, digital strategy and innovation.", "2026-01-07T09:00:00Z"],
  ["Acc_003", "C-Suite Change", "Robert Garriott was named Board Chair, a governance-level transition that could signal new strategic priorities.", "2026-07-01T09:00:00Z"],
  ["Acc_003", "C-Suite Change", "Kevin Kumler was named Levanto President, highlighting Baylor Scott & White's focus on scaling digital health commercialization.", "2025-11-04T09:00:00Z"],
  ["Acc_004", "New Construction Site", "CommonSpirit broke ground on a new ambulatory campus in Phoenix, signaling opportunities for facility equipment and ambulatory-focused technology vendors.", "2026-03-12T09:00:00Z"],
  ["Acc_004", "Technology Partnership", "CommonSpirit selected a new enterprise imaging vendor for its western region hospitals.", "2026-07-22T09:00:00Z"],
  ["Acc_005", "C-Suite Change", "Ascension named a new Chief Digital Officer, signaling increased investment in digital health and IT modernization.", "2026-02-20T09:00:00Z"],
]

const signals: AccountSignal[] = seeds.map(([account_id, signal_title, signal_output, updated_at], i) => ({
  id: i + 1,
  account_id,
  signal_title,
  signal_prompt: PROMPTS[signal_title] ?? "",
  signal_output,
  created_at: updated_at,
  updated_at,
}))

export interface AccountsPageParams {
  limit: number
  offset: number
  search?: string
}

// GET /accounts?limit&offset&search — server order (account_id ASC, which is
// already the mock array's order), case-insensitive name match.
export async function listAccountsPage({ limit, offset, search }: AccountsPageParams): Promise<AccountsPage> {
  await delay(300)
  const q = search?.trim().toLowerCase()
  const all = getMockAccounts()
  const matched = q ? all.filter((a) => a.hospital_name.toLowerCase().includes(q)) : all
  return structuredClone({ items: matched.slice(offset, offset + limit), total: matched.length, limit, offset })
}

// GET /account-signals?account_id=… — signals for the given accounts.
export async function listAccountSignals(accountIds?: string[]): Promise<AccountSignal[]> {
  await delay(250)
  const ids = accountIds ? new Set(accountIds) : null
  return structuredClone(signals.filter((s) => !ids || ids.has(s.account_id)))
}

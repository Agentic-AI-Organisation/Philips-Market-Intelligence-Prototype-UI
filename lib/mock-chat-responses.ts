import type { ChatResponse } from "./types"

// Keyword-matched canned replies for the chat prototype — adapted from
// itaap-commercialit-account-intelligence-ui's own (unwired) mockChatResponses.ts,
// scoped here to Acc_001 ("HCA") since that's the account with rich mock
// research output too (see mock-api.ts). Other accounts get the default reply.

interface MockResponse {
  keywords: string[]
  response: ChatResponse
}

const mockResponses: MockResponse[] = [
  {
    keywords: ["hospital", "bed", "ambulance", "facility", "facilities"],
    response: {
      answer:
        "As of December 31, 2025, HCA Healthcare operates 190 hospitals, of which 179 are general acute care hospitals with a total of 50,436 licensed beds. Additionally, HCA Healthcare has approximately 2,500 ambulatory sites of care, which include surgery centers, freestanding emergency rooms, urgent care centers, and physician clinics.\n\n[1][2]",
      sources: [
        {
          index: 1,
          title: "Hospitals, ambulatory sites, and bed count disclosed for year-end 2025 (SEC 10-K)",
          citations: [
            {
              url: "https://www.sec.gov/Archives/edgar/data/860730/000119312526044769/hca-20251231.htm",
              date: "2026-02-10",
              source: "U.S. Securities and Exchange Commission (SEC) - HCA Healthcare, Inc. Form 10-K",
            },
          ],
          research_group: "organizational_profile",
          sub_requirement: "organizational_footprint",
          recency: "within_24_months",
        },
        {
          index: 2,
          title: "Ambulatory sites of care scale (approximately 2,500) and geographic coverage (19 states + U.K.)",
          citations: [
            {
              url: "https://investor.hcahealthcare.com/financials/quarterly-results/default.aspx",
              date: "Not found",
              source: "HCA Healthcare Investor Relations - Quarterly Results",
            },
          ],
          research_group: "organizational_profile",
          sub_requirement: "organizational_footprint",
          recency: "within_24_months",
        },
      ],
    },
  },
  {
    keywords: ["2025", "happened", "event", "year"],
    response: {
      answer:
        "In 2025, HCA Healthcare reported approximately 47 million patient encounters across its network of 190 hospitals and 2,500 outpatient facilities. Healthgrades recognized 100 HCA Healthcare hospitals with the 2025 Patient Safety Excellence Award, and 33 HCA Healthcare hospitals were recognized on Premier's 2025 100 Top Hospitals list.\n\nHCA reported 2,297,065 admissions for the fiscal year and employed around 320,000 colleagues. [1][2][3]",
      sources: [
        {
          index: 1,
          title: "Impact Report messaging (2025 performance year)",
          citations: [
            { url: "https://www.hcahealthcareimpact.com/", date: "2026-01-01", source: "HCA Healthcare Impact Report" },
          ],
          research_group: "growth_and_corporate_events",
          sub_requirement: "strategy_transformation_themes",
          recency: "within_24_months",
        },
        {
          index: 2,
          title: "Healthgrades recognized 100 HCA Healthcare hospitals as 2025 Patient Safety Excellence Award recipients",
          citations: [
            {
              url: "https://www.hcahealthcareimpact.com/our-network/awards-and-recognition/",
              date: "2026-04-10",
              source: "HCA Healthcare Impact Report (Awards and recognition page)",
            },
          ],
          research_group: "news_signals",
          sub_requirement: "awards_recognitions",
          recency: "within_24_months",
        },
        {
          index: 3,
          title: "Patient volume indicators: admissions and annual patient encounters",
          citations: [
            {
              url: "https://www.stocktitan.net/sec-filings/HCA/10-k-hca-healthcare-inc-files-annual-report.html",
              date: "2026-02-10",
              source: "Stock Titan - summary coverage of HCA Healthcare, Inc. annual report filing",
            },
          ],
          research_group: "organizational_profile",
          sub_requirement: "organizational_footprint",
          recency: "within_24_months",
        },
      ],
    },
  },
  {
    keywords: ["workforce", "employee", "colleague", "staff", "patient", "encounter"],
    response: {
      answer:
        "The workforce size of HCA Healthcare is approximately 320,000 colleagues. In terms of patient volume, HCA reports delivering about 47 million annual patient encounters through its network, which includes 190 hospitals and approximately 2,500 outpatient facilities.\n\n[1]",
      sources: [
        {
          index: 1,
          title: "Workforce size disclosure (approximately 320,000 colleagues) tied to 2025 impact reporting",
          citations: [
            { url: "https://www.hcahealthcareimpact.com/", date: "Not found", source: "HCA Healthcare Impact Report (homepage statement)" },
          ],
          research_group: "organizational_profile",
          sub_requirement: "organizational_footprint",
          recency: "within_24_months",
        },
      ],
    },
  },
  {
    keywords: ["growth", "expand", "expansion", "area"],
    response: {
      answer:
        "HCA Healthcare's recent growth is concentrated on scaling its outpatient footprint — approximately 2,500 outpatient facilities across 19 states in the U.S. and the U.K., contributing to about 47 million patient encounters. The company continues to invest in workforce development and clinical technology, alongside strong patient volume (over 2.29 million admissions for the fiscal year).\n\n[1][2]",
      sources: [
        {
          index: 1,
          title: "Enterprise strategy emphasis: network expansion, workforce development, and advancing clinical capabilities",
          citations: [
            {
              url: "https://investor.hcahealthcare.com/news/news-details/2026/HCA-Healthcare-Reports-Fourth-Quarter-2025-Results/default.aspx",
              date: "2026-01-27",
              source: "HCA Healthcare Investor Relations",
            },
          ],
          research_group: "growth_and_corporate_events",
          sub_requirement: "strategy_transformation_themes",
          recency: "within_24_months",
        },
        {
          index: 2,
          title: "HCA Healthcare corporate profile and core service focus",
          citations: [
            { url: "https://investor.hcahealthcare.com/corporate-profile/default.aspx", date: "Not found", source: "HCA Healthcare Investor Relations - Corporate Profile" },
          ],
          research_group: "organizational_profile",
          sub_requirement: "hospital_overview",
          recency: "within_24_months",
        },
      ],
    },
  },
]

const defaultResponse: ChatResponse = {
  answer:
    "I can help you research information about this account. Try asking about:\n\n- Hospital count and bed capacity\n- Workforce size and patient volume\n- Recent growth events and expansion areas\n\nWhat would you like to know?",
  sources: [],
}

const noDataResponse: ChatResponse = {
  answer: "There isn't any research output for this account yet — try running research for it first, or switch to an account with existing output (e.g. HCA).",
  sources: [],
}

export function getMockChatResponse(accountId: string, query: string): ChatResponse {
  if (accountId !== "Acc_001") return noDataResponse

  const lowerQuery = query.toLowerCase()
  for (const mock of mockResponses) {
    if (mock.keywords.some((keyword) => lowerQuery.includes(keyword))) return mock.response
  }
  return defaultResponse
}

// --- Data-source ("search mode") variants --------------------------------
// The chat widget lets the user pick where answers are drawn from: external
// research output (default) or Seismic (internal sales content). The mock
// serves the same canned answers but re-attributes the citations so the
// sources panel visibly differs per mode.
export type ChatDataSource = "external" | "seismic"

export function getMockChatResponseForSource(accountId: string, query: string, dataSource: ChatDataSource): ChatResponse {
  const base = getMockChatResponse(accountId, query)
  if (dataSource !== "seismic" || base.sources.length === 0) return base
  return {
    answer: base.answer,
    sources: base.sources.map((s) => ({
      ...s,
      citations: s.citations.map((c) => ({
        ...c,
        url: `https://philips.seismic.com/app#/doc/${encodeURIComponent(s.research_group)}-${s.index}`,
        source: `Seismic - ${c.source}`,
      })),
    })),
  }
}

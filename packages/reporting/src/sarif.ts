import type { Report, Finding } from "@opengeo/shared"

const SARIF_VERSION = "2.1.0"
const SARIF_SCHEMA =
  "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"

function severityToLevel(severity: Finding["severity"]): "error" | "warning" | "note" {
  switch (severity) {
    case "critical":
    case "high":
      return "error"
    case "medium":
      return "warning"
    case "low":
      return "note"
  }
}

function findingToResult(finding: Finding): SarifResult {
  return {
    ruleId: finding.id,
    level: severityToLevel(finding.severity),
    message: {
      text: `${finding.title}. ${finding.recommendation.rationale}`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: finding.evidence.url,
          },
          region: finding.evidence.lines
            ? {
                startLine: 1,
                snippet: {
                  text: finding.evidence.snippet ?? finding.evidence.lines.join("\n"),
                },
              }
            : undefined,
        },
      },
    ],
    properties: {
      category: finding.category,
      confidence: finding.confidence,
      severity: finding.severity,
      impact_search: finding.impact.search,
      impact_ai_retrieval: finding.impact.ai_retrieval,
      impact_model_training: finding.impact.model_training,
      impact_user_experience: finding.impact.user_experience,
      recommendation_action: finding.recommendation.action,
      recommendation_effort: finding.recommendation.effort,
      sources: finding.sources.map((s) => `${s.vendor} (${s.type})`).join(", "),
      maintainer: finding.rule_metadata.maintainer,
      evidence_level: finding.rule_metadata.evidence_level,
    },
  }
}

function reportToRules(report: Report): SarifReportingDescriptor[] {
  const ruleMap = new Map<string, SarifReportingDescriptor>()

  for (const finding of report.findings) {
    if (ruleMap.has(finding.id)) continue

    ruleMap.set(finding.id, {
      id: finding.id,
      name: finding.title,
      shortDescription: {
        text: finding.title,
      },
      fullDescription: {
        text: finding.recommendation.rationale,
      },
      defaultConfiguration: {
        level: severityToLevel(finding.severity),
      },
      properties: {
        category: finding.category,
        severity: finding.severity,
        confidence: finding.confidence,
        maintainer: finding.rule_metadata.maintainer,
        evidence_level: finding.rule_metadata.evidence_level,
        last_reviewed: finding.rule_metadata.last_reviewed,
        sources: finding.sources,
      },
      helpUri: finding.sources[0]?.url,
    })
  }

  return [...ruleMap.values()]
}

export function generateSarifReport(report: Report): string {
  const sarif: SarifLog = {
    version: SARIF_VERSION,
    $schema: SARIF_SCHEMA,
    runs: [
      {
        tool: {
          driver: {
            name: "OpenGEO",
            informationUri: "https://github.com/DjimIT/opengeo",
            version: report.metadata.tool_version,
            rules: reportToRules(report),
          },
        },
        results: report.findings.map(findingToResult),
        automationDetails: {
          id: `opengeo/${report.metadata.finished_at}`,
          description: {
            text: `OpenGEO audit of ${report.metadata.target_url} — ${report.metadata.pages_crawled} pages, ${report.metadata.rules_evaluated} rules`,
          },
        },
        columnKind: "utf16CodeUnits",
        properties: {
          target_url: report.metadata.target_url,
          pages_crawled: report.metadata.pages_crawled,
          rules_evaluated: report.metadata.rules_evaluated,
          llm_level: report.metadata.llm_level,
          started_at: report.metadata.started_at,
          finished_at: report.metadata.finished_at,
        },
      },
    ],
  }

  return JSON.stringify(sarif, null, 2)
}

// --- SARIF 2.1.0 TypeScript types (minimal subset) ---

interface SarifLog {
  version: string
  $schema?: string
  runs: SarifRun[]
}

interface SarifRun {
  tool: SarifTool
  results: SarifResult[]
  automationDetails?: SarifAutomationDetails
  columnKind?: string
  properties?: Record<string, unknown>
}

interface SarifTool {
  driver: SarifToolDriver
}

interface SarifToolDriver {
  name: string
  informationUri?: string
  version?: string
  rules?: SarifReportingDescriptor[]
}

interface SarifReportingDescriptor {
  id: string
  name?: string
  shortDescription?: { text: string }
  fullDescription?: { text: string }
  defaultConfiguration?: { level: string }
  properties?: Record<string, unknown>
  helpUri?: string
}

interface SarifResult {
  ruleId: string
  level: string
  message: { text: string }
  locations?: SarifLocation[]
  properties?: Record<string, unknown>
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string }
    region?: { startLine?: number; snippet?: { text: string } }
  }
}

interface SarifAutomationDetails {
  id: string
  description?: { text: string }
}

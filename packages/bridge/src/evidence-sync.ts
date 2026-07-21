import type { Finding, Report } from "@opengeo/shared"

export interface DjimitfloEvidenceInput {
  task_id: string
  finding: Finding
  page_url: string
}

export interface DjimitfloAuditInput {
  task_id: string
  report: Report
  pages_crawled: number
  duration_ms: number
}

export interface EvidenceSyncConfig {
  djimitflo_url: string
  auth_token: string
  task_id: string
}

export class DjimitfloBridge {
  constructor(private config: EvidenceSyncConfig) {}

  async syncFinding(finding: Finding, pageUrl: string): Promise<void> {
    const payload = {
      task_id: this.config.task_id,
      evidence_type: "repository_health_finding",
      severity: mapSeverity(finding.severity),
      title: `[${finding.id}] ${finding.title}`,
      summary: finding.recommendation.rationale,
      details: {
        finding_id: finding.id,
        category: finding.category,
        confidence: finding.confidence,
        evidence: finding.evidence,
        impact: finding.impact,
        recommendation: finding.recommendation,
        sources: finding.sources,
        rule_metadata: finding.rule_metadata,
        page_url: pageUrl,
      },
      source: "opengeo",
    }

    await this.post("/api/evidence/capture", payload)
  }

  async syncReport(report: Report, pagesCrawled: number, durationMs: number): Promise<void> {
    const payload = {
      task_id: this.config.task_id,
      evidence_type: "execution_summary",
      severity: "info",
      title: `OpenGEO audit complete: ${report.findings.length} findings`,
      summary: `Crawled ${pagesCrawled} pages, evaluated ${report.metadata.rules_evaluated} rules, found ${report.findings.length} issues in ${durationMs}ms`,
      details: {
        target_url: report.metadata.target_url,
        tool_version: report.metadata.tool_version,
        pages_crawled: pagesCrawled,
        rules_evaluated: report.metadata.rules_evaluated,
        llm_level: report.metadata.llm_level,
        finding_count: report.findings.length,
        critical_count: report.findings.filter((f) => f.severity === "critical").length,
        high_count: report.findings.filter((f) => f.severity === "high").length,
        medium_count: report.findings.filter((f) => f.severity === "medium").length,
        low_count: report.findings.filter((f) => f.severity === "low").length,
      },
      source: "opengeo",
    }

    await this.post("/api/evidence/capture", payload)
  }

  async syncAllFindings(report: Report): Promise<void> {
    for (const finding of report.findings) {
      await this.syncFinding(finding, finding.evidence.url)
    }
  }

  private async post(path: string, body: unknown): Promise<void> {
    const url = `${this.config.djimitflo_url.replace(/\/$/, "")}${path}`
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.auth_token}`,
        },
        body: JSON.stringify(body),
      })
    } catch {
      // Bridge failures are non-fatal — OpenGEO works standalone
    }
  }
}

function mapSeverity(severity: Finding["severity"]): string {
  switch (severity) {
    case "critical":
      return "critical"
    case "high":
      return "error"
    case "medium":
      return "warning"
    case "low":
      return "info"
  }
}

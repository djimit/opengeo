import * as core from "@actions/core"
import * as github from "@actions/github"
import { runAudit } from "@opengeo/core"
import { DEFAULT_AUDIT_CONFIG } from "@opengeo/rule-engine"
import { generateSarifReport, generateJsonReport, generateMarkdownReport } from "@opengeo/reporting"
import { writeFile } from "node:fs/promises"

async function main(): Promise<void> {
  const url = core.getInput("url")
  const maxPages = parseInt(core.getInput("max_pages") || "50", 10)
  const depth = parseInt(core.getInput("depth") || "2", 10)
  const render = core.getInput("render") as "static" | "javascript"
  const policy = core.getInput("policy") as "strict" | "balanced" | "permissive"
  const failOn = core.getInput("fail_on") || "critical"
  const format = core.getInput("format") || "json"
  const output = core.getInput("output") || "opengeo-report.json"

  core.info(`Running OpenGEO audit on ${url}`)

  const result = await runAudit({
    url,
    config: {
      ...DEFAULT_AUDIT_CONFIG,
      max_pages: maxPages,
      depth,
      render: render || "static",
      policy: policy || "balanced",
      llm_level: 0,
    },
  })

  core.info(`Crawled ${result.pages_crawled} pages, found ${result.findings.length} issues`)

  const failThresholds = { critical: 0, high: 1, medium: 2, low: 3 }
  const threshold = failThresholds[failOn as keyof typeof failThresholds] ?? 0

  const failingFindings = result.findings.filter((f) => {
    const severityValue = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityValue[f.severity] <= threshold
  })

  if (failingFindings.length > 0) {
    core.setFailed(`${failingFindings.length} findings at or above "${failOn}" severity`)
  }

  let reportContent: string
  if (format === "sarif") {
    reportContent = generateSarifReport(result.report)
  } else if (format === "markdown") {
    reportContent = generateMarkdownReport(result.report)
  } else {
    reportContent = generateJsonReport(result.report)
  }

  await writeFile(output, reportContent, "utf-8")

  core.info(`Report written to ${output}`)
  core.setOutput("findings_count", result.findings.length)
  core.setOutput("report_path", output)

  if (format === "sarif" && github.context.eventName === "pull_request") {
    core.info("SARIF report ready for GitHub Code Scanning upload")
    core.info("Pair with: github/codeql-action/upload-sarif@v3")
  }
}

main().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err))
})

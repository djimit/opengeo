import type { Report, Finding } from "@opengeo/shared"
import type { Locale } from "@opengeo/shared/i18n"
import { t } from "@opengeo/shared/i18n"

export function generateMarkdownReport(report: Report, locale: Locale = "en"): string {
  const lines: string[] = []

  lines.push(`# ${t("audit.report", locale)}`)
  lines.push("")
  lines.push(`**${t("audit.target", locale)}:** ${report.metadata.target_url}`)
  lines.push(`**${t("audit.date", locale)}:** ${report.metadata.finished_at}`)
  lines.push(`**${t("audit.pages_crawled", locale)}:** ${report.metadata.pages_crawled}`)
  lines.push(`**${t("audit.rules_evaluated", locale)}:** ${report.metadata.rules_evaluated}`)
  lines.push(`**Tool version:** ${report.metadata.tool_version}`)
  lines.push("")

  const critical = report.findings.filter((f) => f.severity === "critical")
  const high = report.findings.filter((f) => f.severity === "high")
  const medium = report.findings.filter((f) => f.severity === "medium")
  const low = report.findings.filter((f) => f.severity === "low")

  lines.push(`## ${t("audit.summary", locale)}`)
  lines.push("")
  lines.push(`| ${t("audit.severity", locale)} | ${t("audit.count", locale)} |`)
  lines.push(`|----------|-------|`)
  lines.push(`| ${t("audit.critical", locale)} | ${critical.length} |`)
  lines.push(`| ${t("audit.high", locale)} | ${high.length} |`)
  lines.push(`| ${t("audit.medium", locale)} | ${medium.length} |`)
  lines.push(`| ${t("audit.low", locale)} | ${low.length} |`)
  lines.push("")

  if (report.findings.length === 0) {
    lines.push(`## ${t("audit.findings", locale)}`)
    lines.push("")
    lines.push(t("audit.no_findings", locale))
    return lines.join("\n")
  }

  const grouped = groupByCategory(report.findings)

  for (const [category, findings] of Object.entries(grouped)) {
    lines.push(`## ${formatCategory(category, locale)}`)
    lines.push("")

    for (const finding of findings) {
      lines.push(formatFindingMd(finding, locale))
    }
  }

  lines.push("---")
  lines.push("")
  lines.push(`*${t("audit.generated", locale, { version: report.metadata.tool_version })}*`)

  return lines.join("\n")
}

function formatFindingMd(finding: Finding, locale: Locale): string {
  const lines: string[] = []

  lines.push(`### \`${finding.id}\` — ${finding.title}`)
  lines.push("")
  lines.push(`**${t("audit.severity", locale)}:** ${finding.severity} | **${t("confidence", locale)}:** ${finding.confidence} | **${t("category." + finding.category, locale)}**`)
  lines.push("")
  lines.push(`**${t("audit.impact", locale)}:** ${t("search", locale)}: ${finding.impact.search} | ${t("ai_retrieval", locale)}: ${finding.impact.ai_retrieval} | ${t("model_training", locale)}: ${finding.impact.model_training} | ${t("user_experience", locale)}: ${finding.impact.user_experience}`)
  lines.push("")
  lines.push(`**${t("audit.evidence", locale)}:**`)
  lines.push(`- ${t("url", locale)}: ${finding.evidence.url}`)
  if (finding.evidence.snippet) lines.push(`- ${finding.evidence.snippet}`)
  if (finding.evidence.lines) {
    for (const line of finding.evidence.lines) {
      lines.push(`  - \`${line}\``)
    }
  }
  lines.push("")
  lines.push(`**${t("audit.recommendation", locale)}:** ${finding.recommendation.action} (${finding.recommendation.effort} ${t("effort", locale)})`)
  lines.push(`> ${finding.recommendation.rationale}`)
  lines.push("")

  if (finding.patch) {
    lines.push(`**${t("audit.patch", locale)}:**`)
    lines.push("```diff")
    lines.push(finding.patch.content)
    lines.push("```")
    lines.push("")
  }

  lines.push(`**${t("audit.sources", locale)}:**`)
  for (const source of finding.sources) {
    const urlPart = source.url ? ` (${source.url})` : ""
    lines.push(`- ${source.vendor} [${source.type}]${urlPart}`)
  }
  lines.push("")
  lines.push(`**${t("audit.rule", locale)}:** ${finding.rule_metadata.status} | ${t("evidence_level", locale)}: ${finding.rule_metadata.evidence_level} | ${t("last_reviewed", locale)}: ${finding.rule_metadata.last_reviewed} | ${t("maintainer", locale)}: ${finding.rule_metadata.maintainer}`)
  lines.push("")

  return lines.join("\n")
}

function groupByCategory(findings: Finding[]): Record<string, Finding[]> {
  const grouped: Record<string, Finding[]> = {}
  for (const f of findings) {
    if (!grouped[f.category]) grouped[f.category] = []
    grouped[f.category]!.push(f)
  }
  return grouped
}

function formatCategory(category: string, locale: Locale): string {
  const key = `category.${category}`
  const translated = t(key, locale)
  if (translated !== key) return translated
  return category
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

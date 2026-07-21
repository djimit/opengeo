import type { Report, Finding } from "@opengeo/shared"
import type { AuditConfig } from "@opengeo/rule-engine"
import { RuleEngine } from "@opengeo/rule-engine"
import { crawlSite, type CrawlOptions } from "@opengeo/crawler"
import { registerAllRules } from "./rules/index.js"

export interface AuditInput {
  url: string
  config: AuditConfig
  crawl_options?: Partial<CrawlOptions>
  rule_registry?: (engine: RuleEngine) => void
  on_progress?: (stage: string, current: number, total: number) => void
}

export interface AuditOutput {
  report: Report
  findings: Finding[]
  pages_crawled: number
  duration_ms: number
  sitemap_entries_found: number
  rate_limit_stats: { avg_delay_ms: number; total_requests: number }
}

export async function runAudit(input: AuditInput): Promise<AuditOutput> {
  const start = Date.now()

  input.on_progress?.("crawling", 0, input.config.max_pages)

  const crawlResult = await crawlSite(input.url, {
    max_pages: input.config.max_pages,
    depth: input.config.depth,
    concurrency: input.config.render === "javascript" ? 2 : 3,
    timeout_ms: 30_000,
    user_agent: "OpenGeoBot/0.2.0 (+https://github.com/DjimIT/opengeo)",
    follow_redirects: true,
    respect_robots_txt: true,
    render_javascript: input.config.render === "javascript",
    sitemap_discover: true,
    ...input.crawl_options,
  })

  input.on_progress?.("evaluating", 0, crawlResult.pages.length)

  const engine = new RuleEngine()
  registerAllRules(engine)
  if (input.rule_registry) input.rule_registry(engine)

  const allFindings: Finding[] = []
  let evaluated = 0

  for (const page of crawlResult.pages) {
    const result = await engine.evaluate({
      page,
      allPages: crawlResult.pages,
      config: input.config,
    })
    allFindings.push(...result.findings)
    evaluated++
    input.on_progress?.("evaluating", evaluated, crawlResult.pages.length)
  }

  const duration = Date.now() - start

  const report: Report = {
    metadata: {
      target_url: input.url,
      started_at: new Date(start).toISOString(),
      finished_at: new Date().toISOString(),
      tool_version: "0.2.0",
      pages_crawled: crawlResult.pages.length,
      rules_evaluated: engine.getEnabledRules().length,
      llm_level: input.config.llm_level,
    },
    findings: allFindings,
    dimension_scores: calculateDimensionScores(allFindings),
    crawler_policy: undefined,
  }

  input.on_progress?.("complete", allFindings.length, allFindings.length)

  return {
    report,
    findings: allFindings,
    pages_crawled: crawlResult.pages.length,
    duration_ms: duration,
    sitemap_entries_found: crawlResult.sitemap_entries?.length ?? 0,
    rate_limit_stats: crawlResult.rate_limit_stats ?? { avg_delay_ms: 0, total_requests: 0 },
  }
}

function calculateDimensionScores(findings: Finding[]): Report["dimension_scores"] {
  const dimensions = [
    { key: "discoverability", categories: ["crawlability"] },
    { key: "indexability", categories: ["crawlability"] },
    { key: "interpretability", categories: ["structured-data"] },
    { key: "entity_clarity", categories: ["entities"] },
    { key: "answerability", categories: ["content"] },
    { key: "citeability", categories: ["citations"] },
    { key: "authority", categories: ["content"] },
    { key: "freshness", categories: ["content"] },
    { key: "accessibility", categories: ["accessibility"] },
    { key: "performance", categories: ["performance"] },
    { key: "governance", categories: ["governance"] },
    { key: "security", categories: ["security"] },
  ]

  return dimensions.map(({ key, categories }) => {
    const relevant = findings.filter((f) => categories.includes(f.category))
    const critical = relevant.filter((f) => f.severity === "critical").length
    const high = relevant.filter((f) => f.severity === "high").length
    const medium = relevant.filter((f) => f.severity === "medium").length
    const low = relevant.filter((f) => f.severity === "low").length

    const penalty = critical * 25 + high * 15 + medium * 5 + low * 2
    const score = Math.max(0, 100 - penalty)

    return {
      dimension: key,
      score,
      coverage: relevant.length > 0 ? 1 : 0.5,
      finding_count: relevant.length,
      critical_count: critical,
    }
  })
}

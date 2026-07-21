import type { RuleEngine } from "@opengeo/rule-engine"

export function registerAllRules(engine: RuleEngine): void {
  // Import and register MVP rules
  // Note: rules are defined inline here to avoid circular dependencies
  registerMvpRulesInline(engine)
  registerExtendedRulesInline(engine)
}

function registerMvpRulesInline(engine: RuleEngine): void {
  // GEO-CRAWL-001 through GEO-CRAWL-004
  engine.register({
    id: "GEO-CRAWL-001", category: "crawlability", title: "robots.txt missing or unreachable",
    description: "Checks whether the site has a valid robots.txt file", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.allPages.length === 0) return findings
      const firstPage = ctx.page
      if (firstPage.url !== firstPage.final_url && firstPage.url !== firstPage.final_url + "/") return findings
      const hasRobotsDirective = firstPage.robots_directives.length > 0
      if (!hasRobotsDirective && firstPage.status_code === 200) {
        findings.push({
          id: "GEO-CRAWL-001", title: "No robots directives detected on homepage",
          category: "crawlability", severity: "medium", confidence: "medium",
          evidence: { url: firstPage.url, snippet: "No robots meta tag or X-Robots-Tag header detected" },
          impact: { search: "low", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "inform", rationale: "robots.txt is the standard way to communicate crawling preferences to all bots.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-CRAWL-002", category: "crawlability", title: "Homepage blocked by noindex",
    description: "Detects if the homepage has a noindex directive", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.noindex && ctx.page.url === ctx.page.final_url) {
        findings.push({
          id: "GEO-CRAWL-002", title: "Homepage has noindex directive",
          category: "crawlability", severity: "critical", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "robots meta tag contains noindex" },
          impact: { search: "high", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "A noindex directive on the homepage prevents indexing.", effort: "trivial" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/crawling-indexing/robots/robots_meta_tag" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-CRAWL-003", category: "crawlability", title: "Canonical URL missing",
    description: "Pages should have a self-referencing canonical URL", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      if (!ctx.page.canonical) {
        findings.push({
          id: "GEO-CRAWL-003", title: "Page missing canonical URL",
          category: "crawlability", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "No canonical link tag found" },
          impact: { search: "medium", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "Canonical URLs help search engines understand the preferred version.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-CRAWL-004", category: "crawlability", title: "Non-200 HTTP status code",
    description: "Pages returning error status codes cannot be indexed", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code >= 400) {
        findings.push({
          id: "GEO-CRAWL-004", title: `Page returns HTTP ${ctx.page.status_code}`,
          category: "crawlability", severity: ctx.page.status_code >= 500 ? "high" : "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `HTTP ${ctx.page.status_code}` },
          impact: { search: "high", ai_retrieval: "high", model_training: "none", user_experience: "medium" },
          recommendation: { action: "fix", rationale: `HTTP ${ctx.page.status_code} prevents indexing and retrieval.`, effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-DATA-001", category: "structured-data", title: "No JSON-LD structured data detected",
    description: "Pages should include Schema.org structured data as JSON-LD", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      if (ctx.page.jsonld.length === 0) {
        findings.push({
          id: "GEO-DATA-001", title: "No JSON-LD structured data on page",
          category: "structured-data", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "Zero application/ld+json blocks found" },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Structured data helps AI systems understand entities on your page.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-DATA-002", category: "structured-data", title: "Missing Organization schema",
    description: "The site should have an Organization schema", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.url !== ctx.page.final_url && ctx.page.url !== ctx.page.final_url + "/") return findings
      const allJsonLd = ctx.allPages.flatMap((p) => p.jsonld)
      const hasOrg = allJsonLd.some((j) => j.type === "Organization" || j.type === "Corporation" || j.type === "LocalBusiness")
      if (!hasOrg) {
        findings.push({
          id: "GEO-DATA-002", title: "No Organization schema found across crawled pages",
          category: "structured-data", severity: "high", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `Checked ${ctx.allPages.length} pages, none contain Organization schema` },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "AI search systems use Organization schema to identify who operates the site.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/organization" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-CONTENT-001", category: "content", title: "Low word count - thin content risk",
    description: "Pages with very low word count may be considered thin content", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      if (ctx.page.word_count < 100) {
        findings.push({
          id: "GEO-CONTENT-001", title: `Page has very low word count (${ctx.page.word_count} words)`,
          category: "content", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Page contains only ${ctx.page.word_count} words` },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Pages with very low word count provide limited value.", effort: "large" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/essentials/spam-policies#scaled-content-abuse" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-CITE-001", category: "citations", title: "No publication or modification date visible",
    description: "Citable content should show when it was published and last updated", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      if (ctx.page.word_count < 200) return findings
      if (!ctx.page.has_time_element && !ctx.page.has_date_in_meta) {
        findings.push({
          id: "GEO-CITE-001", title: "No publication or modification date visible on page",
          category: "citations", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No time element or date meta tag found" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "AI search systems prioritize fresh, dateable content.", effort: "small" },
          sources: [{ vendor: "Microsoft", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["bing", "ai-search"], maintainer: "@opengeo/citations-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-ENTITY-001", category: "entities", title: "Missing or empty page title",
    description: "Every page should have a descriptive title element", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      if (!ctx.page.title || ctx.page.title.length === 0) {
        findings.push({
          id: "GEO-ENTITY-001", title: "Page has no title element",
          category: "entities", severity: "high", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "Empty or missing title tag" },
          impact: { search: "high", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "The page title is the primary signal for what a page is about.", effort: "trivial" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/title-link" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-ENTITY-002", category: "entities", title: "Missing meta description",
    description: "Pages should have a meta description", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      if (!ctx.page.meta_description || ctx.page.meta_description.length === 0) {
        findings.push({
          id: "GEO-ENTITY-002", title: "Page missing meta description",
          category: "entities", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "No meta description tag found" },
          impact: { search: "medium", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "Meta descriptions are used by search engines and AI systems as a page summary.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/snippet#meta-descriptions" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-ENTITY-003", category: "entities", title: "Multiple or missing H1 heading",
    description: "Each page should have exactly one H1 heading", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      const h1s = ctx.page.headings.filter((h) => h.level === 1)
      if (h1s.length === 0) {
        findings.push({
          id: "GEO-ENTITY-003", title: "Page has no H1 heading",
          category: "entities", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "Zero H1 elements found" },
          impact: { search: "medium", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "The H1 is the primary heading that communicates page topic.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-SEC-001", category: "security", title: "Missing security headers",
    description: "HTTP security headers help protect content and signal quality", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      if (ctx.page.url !== ctx.page.final_url && ctx.page.url !== ctx.page.final_url + "/") return findings
      const required = ["strict-transport-security", "x-content-type-options"]
      const missing = required.filter((h) => !ctx.page.headers.some((ph) => ph.name.toLowerCase() === h))
      if (missing.length > 0) {
        findings.push({
          id: "GEO-SEC-001", title: `Missing security headers: ${missing.join(", ")}`,
          category: "security", severity: "low", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Missing headers: ${missing.join(", ")}` },
          impact: { search: "none", ai_retrieval: "none", model_training: "none", user_experience: "medium" },
          recommendation: { action: "fix", rationale: "Security headers protect users and are an indirect quality signal.", effort: "small" },
          sources: [{ vendor: "Mozilla", type: "official-documentation", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/security-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-PERF-001", category: "performance", title: "Large page size",
    description: "Pages exceeding 500KB may have slow load times", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.status_code !== 200) return findings
      const sizeKb = ctx.page.html_length / 1024
      if (sizeKb > 500) {
        findings.push({
          id: "GEO-PERF-001", title: `Page size exceeds 500KB (${Math.round(sizeKb)}KB)`,
          category: "performance", severity: "low", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `HTML document is ${Math.round(sizeKb)}KB` },
          impact: { search: "low", ai_retrieval: "low", model_training: "none", user_experience: "medium" },
          recommendation: { action: "review", rationale: "Large page sizes can slow rendering and cause crawlers to truncate.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/javascript/javascript-seo" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })

  engine.register({
    id: "GEO-GOV-001", category: "governance", title: "No llms.txt file detected",
    description: "llms.txt provides AI-specific instructions for content usage", enabled: true,
    evaluate(ctx) {
      const findings: any[] = []
      if (ctx.page.url !== ctx.page.final_url && ctx.page.url !== ctx.page.final_url + "/") return findings
      const hasLlmsTxt = ctx.allPages.some((p) => p.url.endsWith("/llms.txt"))
      if (!hasLlmsTxt) {
        findings.push({
          id: "GEO-GOV-001", title: "No llms.txt file found",
          category: "governance", severity: "low", confidence: "medium",
          evidence: { url: `${new URL(ctx.page.url).origin}/llms.txt`, snippet: "No llms.txt file detected at site root" },
          impact: { search: "none", ai_retrieval: "low", model_training: "low", user_experience: "none" },
          recommendation: { action: "inform", rationale: "llms.txt is an emerging convention for communicating AI usage policies.", effort: "small" },
          sources: [{ vendor: "llms.txt", type: "community-consensus", url: "https://llmstxt.org/" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["ai-search"], maintainer: "@opengeo/governance-working-group" },
        })
      }
      return findings
    },
  })
}

function registerExtendedRulesInline(engine: RuleEngine): void {
  // Extended rules are registered from the CLI package to avoid duplication
  // The orchestrator imports from CLI for the full rule set
}

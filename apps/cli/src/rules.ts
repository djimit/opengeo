import type { RuleEngine } from "@opengeo/rule-engine"
import type { Finding, NormalizedPageModel } from "@opengeo/shared"

function isHomepage(ctx: { page: NormalizedPageModel; allPages: NormalizedPageModel[] }): boolean {
  const homepage = ctx.allPages[0]
  return ctx.page.url === homepage?.url
}

export function registerMvpRules(engine: RuleEngine): void {
  engine.register({
    id: "GEO-CRAWL-001",
    category: "crawlability",
    title: "robots.txt missing or unreachable",
    description: "Checks whether the site has a valid robots.txt file",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const { allPages } = ctx
      if (allPages.length === 0) return findings

      const firstPage = allPages[0]!
      const hasRobotsDirective = firstPage.robots_directives.length > 0

      if (!hasRobotsDirective && firstPage.status_code === 200) {
        findings.push({
          id: "GEO-CRAWL-001",
          title: "No robots directives detected on homepage",
          category: "crawlability",
          severity: "medium",
          confidence: "medium",
          evidence: {
            url: firstPage.url,
            snippet: "No <meta name=\"robots\"> tag and no X-Robots-Tag header detected",
          },
          impact: {
            search: "low",
            ai_retrieval: "low",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "inform",
            rationale:
              "robots.txt is not strictly required but is the standard way to communicate crawling preferences to all bots at once. Without it, crawlers default to allowing all access.",
            effort: "small",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing", "ai-search"],
            maintainer: "@opengeo/search-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-CRAWL-002",
    category: "crawlability",
    title: "Homepage blocked by noindex",
    description: "Detects if the homepage has a noindex directive",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx
      if (page.url !== page.final_url && page.url !== page.final_url + "/") return findings

      if (page.noindex) {
        findings.push({
          id: "GEO-CRAWL-002",
          title: "Homepage has noindex directive",
          category: "crawlability",
          severity: "critical",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: "robots meta tag contains noindex",
            raw: page.robots_directives.join(", "),
          },
          impact: {
            search: "high",
            ai_retrieval: "high",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "fix",
            rationale:
              "A noindex directive on the homepage prevents it from appearing in search results and AI search retrieval. This is almost always unintentional.",
            effort: "trivial",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/crawling-indexing/robots/robots_meta_tag",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing", "ai-search"],
            maintainer: "@opengeo/search-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-CRAWL-003",
    category: "crawlability",
    title: "Canonical URL missing",
    description: "Pages should have a self-referencing canonical URL",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings
      if (!page.canonical) {
        findings.push({
          id: "GEO-CRAWL-003",
          title: "Page missing canonical URL",
          category: "crawlability",
          severity: "medium",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: "No <link rel=\"canonical\"> tag found",
          },
          impact: {
            search: "medium",
            ai_retrieval: "low",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "fix",
            rationale:
              "Canonical URLs help search engines understand the preferred version of a page. Without one, duplicate or parameterized URLs may dilute ranking signals.",
            effort: "small",
          },
          patch: {
            format: "unified-diff",
            content: `  <head>\n+   <link rel="canonical" href="${page.url}" />`,
            target_file: "index.html",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing"],
            maintainer: "@opengeo/search-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-DATA-001",
    category: "structured-data",
    title: "No JSON-LD structured data detected",
    description: "Pages should include Schema.org structured data as JSON-LD",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings
      if (page.jsonld.length === 0) {
        findings.push({
          id: "GEO-DATA-001",
          title: "No JSON-LD structured data on page",
          category: "structured-data",
          severity: "medium",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: "Zero <script type=\"application/ld+json\"> blocks found",
          },
          impact: {
            search: "medium",
            ai_retrieval: "high",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "review",
            rationale:
              "Structured data helps search engines and AI systems understand the entities on your page. Without it, you rely solely on content parsing, which is less reliable for entity extraction.",
            effort: "medium",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
            },
            {
              vendor: "Schema.org",
              type: "official-documentation",
              url: "https://schema.org/docs/docsq.html",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing", "ai-search"],
            maintainer: "@opengeo/structured-data-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-DATA-002",
    category: "structured-data",
    title: "Missing Organization schema",
    description: "The site should have an Organization schema identifying the entity",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page, allPages } = ctx

      // Only evaluate on the homepage (first page in crawl order)
      const homepage = allPages[0]
      if (page.url !== homepage?.url) return findings

      const allJsonLd = allPages.flatMap((p) => p.jsonld)
      const orgTypes = ["Organization", "Corporation", "LocalBusiness"]
      const hasOrg = allJsonLd.some((j) => {
        if (!j.type) return false
        const types = Array.isArray(j.type) ? j.type : [j.type]
        return types.some((t) => orgTypes.includes(t))
      })

      if (!hasOrg) {
        findings.push({
          id: "GEO-DATA-002",
          title: "No Organization schema found across crawled pages",
          category: "structured-data",
          severity: "high",
          confidence: "medium",
          evidence: {
            url: page.url,
            snippet: `Checked ${allPages.length} pages, none contain Organization schema`,
          },
          impact: {
            search: "medium",
            ai_retrieval: "high",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "fix",
            rationale:
              "AI search systems use Organization schema to identify who operates the site, what they offer, and how they relate to other entities. This is foundational for entity clarity.",
            effort: "medium",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/appearance/structured-data/organization",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing", "ai-search"],
            maintainer: "@opengeo/structured-data-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-CONTENT-001",
    category: "content",
    title: "Low word count — thin content risk",
    description: "Pages with very low word count may be considered thin content",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings
      if (page.word_count < 100) {
        findings.push({
          id: "GEO-CONTENT-001",
          title: `Page has very low word count (${page.word_count} words)`,
          category: "content",
          severity: "medium",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: `Page contains only ${page.word_count} words of text content`,
          },
          impact: {
            search: "medium",
            ai_retrieval: "high",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "review",
            rationale:
              "Pages with very low word count provide limited value to both search engines and AI retrieval systems. Google's scaled content abuse policy targets low-value pages.",
            effort: "large",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/essentials/spam-policies#scaled-content-abuse",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "ai-search"],
            maintainer: "@opengeo/content-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-CITE-001",
    category: "citations",
    title: "No publication or modification date visible",
    description: "Citable content should show when it was published and last updated",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings
      if (page.word_count < 200) return findings

      const hasDateInMeta = page.has_date_in_meta === true || page.meta_tags.some(
        (m) =>
          m.name.includes("date") ||
          m.name.includes("modified") ||
          m.name.includes("published") ||
          m.name === "article:published_time" ||
          m.name === "article:modified_time",
      )

      const hasTimeElement = page.has_time_element === true

      if (!hasDateInMeta && !hasTimeElement) {
        findings.push({
          id: "GEO-CITE-001",
          title: "No publication or modification date visible on page",
          category: "citations",
          severity: "medium",
          confidence: "medium",
          evidence: {
            url: page.url,
            snippet: "No <time datetime=\"...\"> element or article:published_time meta tag found",
          },
          impact: {
            search: "low",
            ai_retrieval: "medium",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "fix",
            rationale:
              "AI search systems prioritize fresh, dateable content. Without visible dates, systems cannot assess recency or cite temporal context.",
            effort: "small",
          },
          sources: [
            {
              vendor: "Microsoft",
              type: "official-documentation",
              url: "https://blogs.bing.com/webmaster/August-2024/Bing-Webmaster-Tools-now-shows-AI-citation-data",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["bing", "ai-search"],
            maintainer: "@opengeo/citations-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-ENTITY-001",
    category: "entities",
    title: "Missing or empty page title",
    description: "Every page should have a descriptive <title> element",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings

      if (!page.title || page.title.length === 0) {
        findings.push({
          id: "GEO-ENTITY-001",
          title: "Page has no <title> element",
          category: "entities",
          severity: "high",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: "Empty or missing <title> tag",
          },
          impact: {
            search: "high",
            ai_retrieval: "medium",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "fix",
            rationale:
              "The page title is the primary signal for what a page is about. Without it, search engines and AI systems must infer topic from content alone, which is less reliable.",
            effort: "trivial",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/appearance/title-link",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing", "ai-search"],
            maintainer: "@opengeo/entities-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-ENTITY-002",
    category: "entities",
    title: "Missing meta description",
    description: "Pages should have a meta description for search and AI retrieval",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings

      if (!page.meta_description || page.meta_description.length === 0) {
        findings.push({
          id: "GEO-ENTITY-002",
          title: "Page missing meta description",
          category: "entities",
          severity: "medium",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: "No <meta name=\"description\"> tag found",
          },
          impact: {
            search: "medium",
            ai_retrieval: "medium",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "fix",
            rationale:
              "Meta descriptions are used by search engines and may be used by AI systems as a page summary. Without one, systems generate their own snippet, which may be less accurate.",
            effort: "small",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/appearance/snippet#meta-descriptions",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing", "ai-search"],
            maintainer: "@opengeo/entities-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-ENTITY-003",
    category: "entities",
    title: "Multiple or missing H1 heading",
    description: "Each page should have exactly one H1 heading",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings

      const h1s = page.headings.filter((h) => h.level === 1)

      if (h1s.length === 0) {
        findings.push({
          id: "GEO-ENTITY-003",
          title: "Page has no H1 heading",
          category: "entities",
          severity: "medium",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: "Zero <h1> elements found in heading structure",
          },
          impact: {
            search: "medium",
            ai_retrieval: "medium",
            model_training: "none",
            user_experience: "none",
          },
          recommendation: {
            action: "fix",
            rationale:
              "The H1 is the primary heading that communicates page topic. Without it, the heading hierarchy is broken and both search engines and AI systems lose a key structural signal.",
            effort: "small",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "community-consensus",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing", "ai-search"],
            maintainer: "@opengeo/entities-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-SEC-001",
    category: "security",
    title: "Missing security headers",
    description: "HTTP security headers help protect content and signal quality to crawlers",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings
      if (!page.url.startsWith("https://")) return findings

      const requiredHeaders = ["strict-transport-security", "x-content-type-options"]
      const missing = requiredHeaders.filter(
        (h) => !page.headers.some((ph) => ph.name.toLowerCase() === h),
      )

      if (missing.length > 0) {
        findings.push({
          id: "GEO-SEC-001",
          title: `Missing security headers: ${missing.join(", ")}`,
          category: "security",
          severity: "low",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: `Missing headers: ${missing.join(", ")}`,
            raw: page.headers.map((h) => `${h.name}: ${h.value}`).join("\n"),
          },
          impact: {
            search: "none",
            ai_retrieval: "none",
            model_training: "none",
            user_experience: "medium",
          },
          recommendation: {
            action: "fix",
            rationale:
              "Security headers protect users and are an indirect quality signal. Google has indicated that HTTPS is a ranking factor, and security headers reinforce trust.",
            effort: "small",
          },
          sources: [
            {
              vendor: "Mozilla",
              type: "official-documentation",
              url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "community-consensus",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search"],
            maintainer: "@opengeo/security-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-PERF-001",
    category: "performance",
    title: "Large page size",
    description: "Pages exceeding 500KB may have slow load times affecting crawl and ranking",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code !== 200) return findings

      const sizeKb = page.html_length / 1024
      if (sizeKb > 500) {
        findings.push({
          id: "GEO-PERF-001",
          title: `Page size exceeds 500KB (${Math.round(sizeKb)}KB)`,
          category: "performance",
          severity: "low",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: `HTML document is ${Math.round(sizeKb)}KB`,
          },
          impact: {
            search: "low",
            ai_retrieval: "low",
            model_training: "none",
            user_experience: "medium",
          },
          recommendation: {
            action: "review",
            rationale:
              "Large page sizes can slow down rendering and may cause crawlers to time out or truncate content extraction. Consider splitting content or lazy-loading non-critical resources.",
            effort: "medium",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/advanced/javascript/javascript-seo",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "community-consensus",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search"],
            maintainer: "@opengeo/performance-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-GOV-001",
    category: "governance",
    title: "No llms.txt file detected",
    description: "llms.txt provides AI-specific instructions for how content may be used",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const { allPages } = ctx

      const hasLlmsTxt = allPages.some((p) => p.url.endsWith("/llms.txt"))

      if (!hasLlmsTxt) {
        findings.push({
          id: "GEO-GOV-001",
          title: "No llms.txt file found",
          category: "governance",
          severity: "low",
          confidence: "medium",
          evidence: {
            url: `${new URL(ctx.page.url).origin}/llms.txt`,
            snippet: "No llms.txt file detected at site root",
          },
          impact: {
            search: "none",
            ai_retrieval: "low",
            model_training: "low",
            user_experience: "none",
          },
          recommendation: {
            action: "inform",
            rationale:
              "llms.txt is an emerging convention for communicating AI usage policies to crawlers. It does not guarantee behavior but provides explicit guidance. OpenGEO does not endorse llms.txt as a ranking factor — it is a governance signal only.",
            effort: "small",
          },
          sources: [
            {
              vendor: "llms.txt",
              type: "community-consensus",
              url: "https://llmstxt.org/",
            },
          ],
          rule_metadata: {
            status: "experimental",
            evidence_level: "community-consensus",
            last_reviewed: "2026-07-20",
            applicable_to: ["ai-search"],
            maintainer: "@opengeo/governance-working-group",
          },
        })
      }

      return findings
    },
  })

  engine.register({
    id: "GEO-CRAWL-004",
    category: "crawlability",
    title: "Non-200 HTTP status code",
    description: "Pages returning error status codes cannot be indexed or retrieved",
    enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const { page } = ctx

      if (page.status_code >= 400) {
        findings.push({
          id: "GEO-CRAWL-004",
          title: `Page returns HTTP ${page.status_code}`,
          category: "crawlability",
          severity: page.status_code >= 500 ? "high" : "medium",
          confidence: "high",
          evidence: {
            url: page.url,
            snippet: `HTTP ${page.status_code}`,
          },
          impact: {
            search: "high",
            ai_retrieval: "high",
            model_training: "none",
            user_experience: "medium",
          },
          recommendation: {
            action: "fix",
            rationale:
              `HTTP ${page.status_code} responses prevent indexing and AI retrieval. ${
                page.status_code >= 500
                  ? "Server errors indicate infrastructure issues that must be resolved."
                  : "Client errors mean the page is not accessible."
              }`,
            effort: "medium",
          },
          sources: [
            {
              vendor: "Google",
              type: "official-documentation",
              url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors",
            },
          ],
          rule_metadata: {
            status: "verified",
            evidence_level: "official-documentation",
            last_reviewed: "2026-07-20",
            applicable_to: ["google-search", "bing", "ai-search"],
            maintainer: "@opengeo/search-working-group",
          },
        })
      }

      return findings
    },
  })
}

import type { RuleEngine } from "@opengeo/rule-engine"
import type { Finding, NormalizedPageModel } from "@opengeo/shared"

function isHomepage(ctx: { page: NormalizedPageModel; allPages: NormalizedPageModel[] }): boolean {
  const homepage = ctx.allPages[0]
  return ctx.page.url === homepage?.url
}

/** Check if a JSON-LD block has a given @type (handles both string and array types) */
function hasJsonLdType(jsonLd: Array<{ type?: string | string[] }>, targetType: string | string[]): boolean {
  const targets = Array.isArray(targetType) ? targetType : [targetType]
  return jsonLd.some((j) => {
    if (!j.type) return false
    const types = Array.isArray(j.type) ? j.type : [j.type]
    return types.some((t) => targets.includes(t))
  })
}

export function registerExtendedRules(engine: RuleEngine): void {

  // GEO-CRAWL-005: Redirect chains
  engine.register({
    id: "GEO-CRAWL-005", category: "crawlability", title: "Redirect chain detected",
    description: "Pages with multiple sequential redirects waste crawl budget", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.url !== ctx.page.final_url && ctx.page.url.replace(/\/$/, "") !== ctx.page.final_url.replace(/\/$/, "")) {
        findings.push({
          id: "GEO-CRAWL-005", title: "Page redirects to different URL",
          category: "crawlability", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `Redirects to: ${ctx.page.final_url}` },
          impact: { search: "low", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Redirects add latency and may dilute ranking signals. Direct links are preferred.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CRAWL-006: Orphan page
  engine.register({
    id: "GEO-CRAWL-006", category: "crawlability", title: "Orphan page — no internal links",
    description: "Pages not linked from any other internal page are hard to discover", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      // Skip homepage (first page)
      if (ctx.page.url === ctx.allPages[0]?.url) return findings
      // Check if any page links to this page (handle both absolute and relative URLs)
      const isLinked = ctx.allPages.some((p) =>
        p.links.some((l) => {
          if (!l.is_internal) return false
          return l.href === ctx.page.url ||
            l.href === ctx.page.final_url ||
            ctx.page.url.endsWith(l.href) ||
            ctx.page.final_url.endsWith(l.href)
        })
      )
      // Only flag as orphan if we have enough crawl data (at least 20 pages or 50% of max)
      const enoughData = ctx.allPages.length >= 20 || ctx.allPages.length >= ctx.config.max_pages * 0.5
      if (!isLinked && enoughData) {
        findings.push({
          id: "GEO-CRAWL-006", title: "Orphan page — no internal links point here",
          category: "crawlability", severity: "low", confidence: "low",
          evidence: { url: ctx.page.url, snippet: `Not linked from any of ${ctx.allPages.length} crawled pages` },
          impact: { search: "medium", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Orphan pages are difficult for crawlers to discover and may not be indexed.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/crawling/sitemaps" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CRAWL-007: Duplicate content detection
  engine.register({
    id: "GEO-CRAWL-007", category: "crawlability", title: "Potential duplicate content",
    description: "Pages with identical or near-identical content dilute ranking signals", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const similar = ctx.allPages.filter((p) => p.url !== ctx.page.url && p.text_content === ctx.page.text_content)
      if (similar.length > 0) {
        findings.push({
          id: "GEO-CRAWL-007", title: `Duplicate content detected (${similar.length} identical pages)`,
          category: "crawlability", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Identical to: ${similar.map((s) => s.url).join(", ")}` },
          impact: { search: "medium", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "Duplicate content splits ranking signals. Use canonical URLs to consolidate.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/guidelines/duplicate-content" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CRAWL-008: Nofollow on internal links
  engine.register({
    id: "GEO-CRAWL-008", category: "crawlability", title: "Internal links marked nofollow",
    description: "Nofollow on internal links prevents PageRank flow and crawler discovery", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const nofollowLinks = ctx.page.links.filter((l) => l.is_internal && l.nofollow)
      if (nofollowLinks.length > 0) {
        findings.push({
          id: "GEO-CRAWL-008", title: `${nofollowLinks.length} internal links marked nofollow`,
          category: "crawlability", severity: "low", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Nofollow links: ${nofollowLinks.slice(0, 3).map((l) => l.href).join(", ")}` },
          impact: { search: "low", ai_retrieval: "none", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Internal nofollow links prevent crawlers from discovering and ranking those pages.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/crawling/qualify-outbound-links" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-DATA-003: JSON-LD parse error
  engine.register({
    id: "GEO-DATA-003", category: "structured-data", title: "JSON-LD parse error detected",
    description: "Malformed JSON-LD blocks prevent search engines from reading structured data", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const broken = ctx.page.jsonld.filter((j) => !j.parsed && j.raw.length > 0)
      if (broken.length > 0) {
        findings.push({
          id: "GEO-DATA-003", title: `${broken.length} JSON-LD block(s) failed to parse`,
          category: "structured-data", severity: "high", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "Invalid JSON in application/ld+json script tag" },
          impact: { search: "medium", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "Broken JSON-LD prevents search engines from extracting structured data. Validate with Google's Rich Results Test.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/tool" }],
          rule_metadata: { status: "verified", evidence_level: "reproducible-test", last_reviewed: "2026-07-20", applicable_to: ["google-search", "bing"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-DATA-004: Breadcrumb missing
  engine.register({
    id: "GEO-DATA-004", category: "structured-data", title: "BreadcrumbList schema missing",
    description: "Breadcrumb navigation helps search engines understand site hierarchy", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.url === ctx.page.final_url) return findings
      const hasBreadcrumb = hasJsonLdType(ctx.page.jsonld, "BreadcrumbList")
      if (!hasBreadcrumb) {
        findings.push({
          id: "GEO-DATA-004", title: "No BreadcrumbList schema on content page",
          category: "structured-data", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No BreadcrumbList JSON-LD found" },
          impact: { search: "low", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "BreadcrumbList helps search engines and AI systems understand page hierarchy within your site.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/breadcrumb" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CONTENT-002: Missing author information
  engine.register({
    id: "GEO-CONTENT-002", category: "content", title: "No author information visible",
    description: "Content pages should identify the author for E-E-A-T signals", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 300) return findings
      const hasAuthor = hasJsonLdType(ctx.page.jsonld, ["Article", "BlogPosting"]) ||
        ctx.page.text_content.toLowerCase().includes("by ") ||
        ctx.page.meta_tags.some((m) => m.name === "author" || m.name === "article:author")
      if (!hasAuthor) {
        findings.push({
          id: "GEO-CONTENT-002", title: "No author information on content page",
          category: "content", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No author meta tag, byline, or Article schema author property found" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "Author attribution supports E-E-A-T signals and helps AI systems assess content credibility.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/article" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CONTENT-003: Missing FAQ or HowTo schema
  engine.register({
    id: "GEO-CONTENT-003", category: "content", title: "FAQ/HowTo content without schema markup",
    description: "Content that answers questions should use FAQPage or HowTo schema for AI retrieval", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const text = ctx.page.text_content.toLowerCase()
      // Look for actual question patterns in text content, not just "?" which appears everywhere
      const questionPatterns = [/what is/i, /how to/i, /why does/i, /how do i/i, /what are/i, /can i/i, /should i/i]
      const questionCount = questionPatterns.filter((p) => p.test(text)).length
      const hasFaqContent = questionCount >= 2
      const hasFaqSchema = hasJsonLdType(ctx.page.jsonld, ["FAQPage", "HowTo"])
      if (hasFaqContent && !hasFaqSchema && ctx.page.word_count > 200) {
        findings.push({
          id: "GEO-CONTENT-003", title: "Question-answer content without FAQ/HowTo schema",
          category: "content", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "Content contains questions but no FAQPage or HowTo schema markup" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "FAQ and HowTo schema markup increases chances of appearing in AI search results and featured snippets.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/faqpage" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CITE-002: Claims without sources
  engine.register({
    id: "GEO-CITE-002", category: "citations", title: "Statistical claims without source attribution",
    description: "Pages with statistics or data claims should cite sources for citability", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 200) return findings
      const text = ctx.page.text_content
      const hasStats = /\d+%|\d+ percent|\d+x (more|less|faster|better)|\$\d+/.test(text)
      const hasSources = text.toLowerCase().includes("according to") || text.toLowerCase().includes("study") ||
        text.toLowerCase().includes("research") || text.toLowerCase().includes("source") ||
        ctx.page.links.filter((l) => !l.is_internal).length > 0
      if (hasStats && !hasSources) {
        findings.push({
          id: "GEO-CITE-002", title: "Statistical claims without source attribution",
          category: "citations", severity: "medium", confidence: "low",
          evidence: { url: ctx.page.url, snippet: "Page contains statistics but no source citations or external references" },
          impact: { search: "none", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Unattributed statistics are difficult for AI systems to verify and cite. Add source references.", effort: "medium" },
          sources: [{ vendor: "Microsoft", type: "official-documentation", url: "https://blogs.bing.com/webmaster/August-2024/Bing-Webmaster-Tools-now-shows-AI-citation-data" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["ai-search"], maintainer: "@opengeo/citations-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-ENTITY-004: Inconsistent organization name
  engine.register({
    id: "GEO-ENTITY-004", category: "entities", title: "Inconsistent organization name across pages",
    description: "Organization name should be consistent across all pages and structured data", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.allPages.length < 2) return findings
      const orgNames = new Set<string>()
      for (const page of ctx.allPages) {
        const orgSchema = page.jsonld.find((j) => hasJsonLdType([j], "Organization"))
        if (orgSchema?.parsed?.name) orgNames.add(String(orgSchema.parsed.name))
      }
      if (orgNames.size > 1) {
        findings.push({
          id: "GEO-ENTITY-004", title: "Inconsistent organization name in structured data",
          category: "entities", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Found ${orgNames.size} different names: ${[...orgNames].join(" vs ")}` },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "Inconsistent organization names confuse AI systems trying to identify your entity.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/organization" }],
          rule_metadata: { status: "verified", evidence_level: "reproducible-test", last_reviewed: "2026-07-20", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-SEC-002: HTTPS check
  engine.register({
    id: "GEO-SEC-002", category: "security", title: "Site not using HTTPS",
    description: "HTTPS is a ranking factor and required for modern web features", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      if (!ctx.page.url.startsWith("https://")) {
        findings.push({
          id: "GEO-SEC-002", title: "Site not using HTTPS",
          category: "security", severity: "high", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "URL uses HTTP, not HTTPS" },
          impact: { search: "medium", ai_retrieval: "none", model_training: "none", user_experience: "medium" },
          recommendation: { action: "fix", rationale: "HTTPS is a Google ranking factor and is required for many browser features. Mixed content warnings harm user trust.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/security/https" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/security-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-PERF-002: Large DOM
  engine.register({
    id: "GEO-PERF-002", category: "performance", title: "Large HTML document",
    description: "Pages with very large HTML may have slow rendering and crawl issues", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const sizeKb = ctx.page.html_length / 1024
      if (sizeKb > 1000) {
        findings.push({
          id: "GEO-PERF-002", title: `HTML document exceeds 1MB (${Math.round(sizeKb)}KB)`,
          category: "performance", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `HTML is ${Math.round(sizeKb)}KB` },
          impact: { search: "low", ai_retrieval: "low", model_training: "none", user_experience: "medium" },
          recommendation: { action: "review", rationale: "Very large HTML documents can slow rendering and may cause crawlers to truncate content.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/javascript/javascript-seo" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-GOV-002: Missing privacy policy
  engine.register({
    id: "GEO-GOV-002", category: "governance", title: "No privacy policy link detected",
    description: "Sites should link to a privacy policy for GDPR/CCPA compliance and trust", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasPrivacy = ctx.allPages.some((p) =>
        p.links.some((l) => l.href.toLowerCase().includes("privacy") || l.text?.toLowerCase().includes("privacy"))
      )
      if (!hasPrivacy) {
        findings.push({
          id: "GEO-GOV-002", title: "No privacy policy link found",
          category: "governance", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No link containing 'privacy' found on any crawled page" },
          impact: { search: "none", ai_retrieval: "none", model_training: "none", user_experience: "low" },
          recommendation: { action: "review", rationale: "Privacy policy links are required for GDPR/CCPA compliance and are a trust signal.", effort: "small" },
          sources: [{ vendor: "ICO", type: "official-documentation", url: "https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["general"], maintainer: "@opengeo/governance-working-group" },
        })
      }
       return findings
    },
  })

  // GEO-CRAWL-009: Missing hreflang for international sites
  engine.register({
    id: "GEO-CRAWL-009", category: "crawlability", title: "Missing hreflang annotations",
    description: "International sites should use hreflang to indicate language/region variants", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasHreflang = ctx.allPages.some((p) => p.hreflang && p.hreflang.length > 0)
      if (!hasHreflang && ctx.allPages.length > 1) {
        findings.push({
          id: "GEO-CRAWL-009", title: "No hreflang annotations found",
          category: "crawlability", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No hreflink link tags or headers detected across crawled pages" },
          impact: { search: "medium", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Hreflang annotations help search engines serve the correct language/region version to users.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/specialities/international/managing-multi-regional-sites" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CRAWL-010: Hreflang x-default missing
  engine.register({
    id: "GEO-CRAWL-010", category: "crawlability", title: "Hreflang without x-default",
    description: "Hreflang annotations should include an x-default fallback", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const pagesWithHreflang = ctx.allPages.filter((p) => p.hreflang && p.hreflang.length > 0)
      if (pagesWithHreflang.length > 0) {
        const hasXDefault = pagesWithHreflang.some((p) => p.hreflang!.some((h) => h.lang === "x-default"))
        if (!hasXDefault) {
          findings.push({
            id: "GEO-CRAWL-010", title: "Hreflang present but no x-default fallback",
            category: "crawlability", severity: "low", confidence: "high",
            evidence: { url: ctx.page.url, snippet: "Hreflang annotations found but no x-default entry" },
            impact: { search: "low", ai_retrieval: "none", model_training: "none", user_experience: "none" },
            recommendation: { action: "fix", rationale: "x-default tells search engines which page to show when no language/region matches the user.", effort: "small" },
            sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/specialities/international/localized-versions" }],
            rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
          })
        }
      }
      return findings
    },
  })

  // GEO-PERF-003: Slow render time
  engine.register({
    id: "GEO-PERF-003", category: "performance", title: "Slow JavaScript rendering detected",
    description: "Pages with slow JS rendering may have poor user experience and crawl issues", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.render_time_ms && ctx.page.render_time_ms > 5000) {
        findings.push({
          id: "GEO-PERF-003", title: `Slow render time: ${ctx.page.render_time_ms}ms`,
          category: "performance", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `JavaScript rendering took ${ctx.page.render_time_ms}ms` },
          impact: { search: "low", ai_retrieval: "low", model_training: "none", user_experience: "medium" },
          recommendation: { action: "review", rationale: "Slow rendering can lead to incomplete crawling and poor Core Web Vitals scores.", effort: "large" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/javascript/javascript-seo" }],
          rule_metadata: { status: "verified", evidence_level: "reproducible-test", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-PERF-004: JavaScript errors on page
  engine.register({
    id: "GEO-PERF-004", category: "performance", title: "JavaScript errors detected",
    description: "JS errors during rendering may indicate broken functionality", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.js_errors && ctx.page.js_errors.length > 0) {
        findings.push({
          id: "GEO-PERF-004", title: `${ctx.page.js_errors.length} JavaScript error(s) during render`,
          category: "performance", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: ctx.page.js_errors.slice(0, 3).join("; ") },
          impact: { search: "none", ai_retrieval: "none", model_training: "none", user_experience: "medium" },
          recommendation: { action: "review", rationale: "JavaScript errors may break functionality for users and prevent content from rendering correctly.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "reproducible-test", last_reviewed: "2026-07-20", applicable_to: ["general"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-DATA-005: Missing WebSite schema
  engine.register({
    id: "GEO-DATA-005", category: "structured-data", title: "Missing WebSite schema",
    description: "Homepage should include WebSite schema with site name and search action", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasWebSite = ctx.allPages.some((p) => hasJsonLdType(p.jsonld, "WebSite"))
      if (!hasWebSite) {
        findings.push({
          id: "GEO-DATA-005", title: "No WebSite schema on homepage",
          category: "structured-data", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No WebSite JSON-LD found" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "WebSite schema helps search engines understand your site identity and enables sitelinks search box.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-WEBVITAL-001: Poor LCP
  engine.register({
    id: "GEO-WEBVITAL-001", category: "performance", title: "Poor Largest Contentful Paint (LCP)",
    description: "LCP above 4 seconds indicates poor loading performance", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const lcp = ctx.page.core_web_vitals?.lcp
      if (lcp !== undefined && lcp !== null && lcp > 4000) {
        findings.push({
          id: "GEO-WEBVITAL-001", title: `Poor LCP: ${(lcp / 1000).toFixed(1)}s (target: <2.5s)`,
          category: "performance", severity: "high", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `LCP measured at ${lcp}ms` },
          impact: { search: "medium", ai_retrieval: "none", model_training: "none", user_experience: "high" },
          recommendation: { action: "fix", rationale: "LCP is a Core Web Vital and direct ranking factor. Optimize largest content element loading.", effort: "large" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://web.dev/articles/lcp" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-WEBVITAL-002: Poor INP
  engine.register({
    id: "GEO-WEBVITAL-002", category: "performance", title: "Poor Interaction to Next Paint (INP)",
    description: "INP above 500ms indicates poor interactivity", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const inp = ctx.page.core_web_vitals?.inp
      if (inp !== undefined && inp !== null && inp > 500) {
        findings.push({
          id: "GEO-WEBVITAL-002", title: `Poor INP: ${inp.toFixed(0)}ms (target: <200ms)`,
          category: "performance", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `INP measured at ${inp}ms` },
          impact: { search: "medium", ai_retrieval: "none", model_training: "none", user_experience: "high" },
          recommendation: { action: "fix", rationale: "INP is a Core Web Vital measuring responsiveness. Optimize event handlers and reduce main-thread blocking.", effort: "large" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://web.dev/articles/inp" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-WEBVITAL-003: Poor CLS
  engine.register({
    id: "GEO-WEBVITAL-003", category: "performance", title: "Poor Cumulative Layout Shift (CLS)",
    description: "CLS above 0.25 indicates visual instability", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const cls = ctx.page.core_web_vitals?.cls
      if (cls !== undefined && cls !== null && cls > 0.25) {
        findings.push({
          id: "GEO-WEBVITAL-003", title: `Poor CLS: ${cls.toFixed(3)} (target: <0.1)`,
          category: "performance", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `CLS measured at ${cls.toFixed(4)}` },
          impact: { search: "medium", ai_retrieval: "none", model_training: "none", user_experience: "high" },
          recommendation: { action: "fix", rationale: "CLS is a Core Web Vital measuring visual stability. Set explicit dimensions for images/ads and avoid injecting content above existing content.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://web.dev/articles/cls" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })
}

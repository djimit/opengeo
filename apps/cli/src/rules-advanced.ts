import type { RuleEngine } from "@opengeo/rule-engine"
import type { Finding, NormalizedPageModel } from "@opengeo/shared"

/** Check if a JSON-LD block has a given @type (handles both string and array types) */
function hasJsonLdType(jsonLd: Array<{ type?: string | string[] }>, targetType: string | string[]): boolean {
  const targets = Array.isArray(targetType) ? targetType : [targetType]
  return jsonLd.some((j) => {
    if (!j.type) return false
    const types = Array.isArray(j.type) ? j.type : [j.type]
    return types.some((t) => targets.includes(t))
  })
}

/** Check if page is homepage */
function isHomepage(ctx: { page: NormalizedPageModel; allPages: NormalizedPageModel[] }): boolean {
  return ctx.page.url === ctx.allPages[0]?.url
}

export function registerAdvancedRules(engine: RuleEngine): void {

  // =====================================================================
  // CONTENT STRUCTURE & SEMANTISCHE DIEPTE
  // =====================================================================

  // GEO-ADV-001: Thin heading structure (no H2s on content pages)
  engine.register({
    id: "GEO-ADV-001", category: "content", title: "Missing H2 headings on content page",
    description: "Content pages need H2 headings for AI systems to understand structure", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 200) return findings
      const h2s = ctx.page.headings.filter((h) => h.level === 2)
      if (h2s.length === 0) {
        findings.push({
          id: "GEO-ADV-001", title: "Content page has no H2 headings",
          category: "content", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Page has ${ctx.page.word_count} words but zero H2 headings` },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "AI systems use heading structure (H1-H6) to understand content organization and extract key topics. Without H2s, AI cannot identify subtopics, reducing chances of being cited for specific questions.",
            effort: "small",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/guidelines/headings" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-ADV-002: Content too short for topic authority
  engine.register({
    id: "GEO-ADV-002", category: "content", title: "Content too thin for topic authority",
    description: "AI systems prefer comprehensive content that covers a topic fully", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count >= 300) return findings
      if (ctx.page.word_count < 50) return findings // Already flagged by CONTENT-001
      // Check if this looks like a content page (not a utility page)
      const isContentPage = /\/(blog|artikel|kennis|knowledge|diensten|services)\//i.test(ctx.page.url)
      if (isContentPage && ctx.page.word_count < 300) {
        findings.push({
          id: "GEO-ADV-002", title: `Content page only ${ctx.page.word_count} words (aim for 500+ for authority)`,
          category: "content", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `Content page has only ${ctx.page.word_count} words — AI systems prefer 500+ for topic authority` },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI systems assess content depth when deciding which source to cite. Thin content (under 300 words) is less likely to be cited than comprehensive coverage (500+ words with examples, data, and subtopics).",
            effort: "large",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // E-E-A-T SIGNALEN
  // =====================================================================

  // GEO-ADV-003: Missing About page link
  engine.register({
    id: "GEO-ADV-003", category: "content", title: "No link to About page detected",
    description: "About pages establish entity identity and trust for AI systems", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasAboutLink = ctx.allPages.some((p) =>
        p.links.some((l) => l.is_internal && /\/(about|over|over-ons|wie-zijn-wij)/i.test(l.href))
      )
      if (!hasAboutLink) {
        findings.push({
          id: "GEO-ADV-003", title: "No link to About/Over Ons page found",
          category: "content", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No internal link matching /about/, /over/, /over-ons/, or /wie-zijn-wij/ found" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI systems look for About pages to establish entity identity, expertise, and trustworthiness. A clear About page with credentials, team info, and company history signals E-E-A-T to AI crawlers.",
            effort: "small",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/guidelines/expertise" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-ADV-004: Missing contact information
  engine.register({
    id: "GEO-ADV-004", category: "content", title: "No contact page or information detected",
    description: "Contact info is a trust signal for AI systems and Google", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasContactLink = ctx.allPages.some((p) =>
        p.links.some((l) => l.is_internal && /\/(contact|kontakt)/i.test(l.href))
      )
      if (!hasContactLink) {
        findings.push({
          id: "GEO-ADV-004", title: "No contact page link found",
          category: "content", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No link to /contact/ or /kontakt/ found on any crawled page" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "Contact information (address, email, phone) is a trust signal for AI systems. Pages with clear contact info are perceived as more trustworthy and are more likely to be cited.",
            effort: "small",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // STRUCTURED DATA VOLLEDIGHEID
  // =====================================================================

  // GEO-ADV-005: Blog post missing full Article schema
  engine.register({
    id: "GEO-ADV-005", category: "structured-data", title: "Article schema missing required properties",
    description: "Article schema needs headline, datePublished, author, and publisher for AI citation", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const isBlogPost = /\/(blog|artikel|post|nieuws)\//i.test(ctx.page.url) || ctx.page.url.includes("/blog")
      if (!isBlogPost || ctx.page.word_count < 200) return findings
      const hasArticleSchema = hasJsonLdType(ctx.page.jsonld, ["Article", "BlogPosting", "NewsArticle"])
      if (hasArticleSchema) {
        // Check if the Article schema has required properties
        const articleSchema = ctx.page.jsonld.find((j) => {
          if (!j.type) return false
          const types = Array.isArray(j.type) ? j.type : [j.type]
          return types.some((t) => ["Article", "BlogPosting", "NewsArticle"].includes(t))
        })
        const parsed = articleSchema?.parsed as Record<string, unknown> | undefined
        const missing: string[] = []
        if (!parsed?.headline && !parsed?.name) missing.push("headline")
        if (!parsed?.datePublished) missing.push("datePublished")
        if (!parsed?.author) missing.push("author")
        if (!parsed?.publisher) missing.push("publisher")
        if (!parsed?.dateModified) missing.push("dateModified")
        if (missing.length > 2) {
          findings.push({
            id: "GEO-ADV-005", title: `Article schema missing: ${missing.join(", ")}`,
            category: "structured-data", severity: "medium", confidence: "high",
            evidence: { url: ctx.page.url, snippet: `Article schema found but missing: ${missing.join(", ")}` },
            impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
            recommendation: {
              action: "fix",
              rationale: "Complete Article schema (headline, datePublished, author, publisher, dateModified) is the strongest signal for AI systems to identify and cite your content. Missing properties reduce AI citation chances.",
              effort: "medium",
            },
            sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/article" }],
            rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/structured-data-working-group" },
          })
        }
      }
      return findings
    },
  })

  // =====================================================================
  // SITE ARCHITECTUUR
  // =====================================================================

  // GEO-ADV-006: Pages too deep in site hierarchy
  engine.register({
    id: "GEO-ADV-006", category: "crawlability", title: "Pages buried deep in site hierarchy",
    description: "Pages 4+ levels deep receive less crawl attention and PageRank", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const deepPages = ctx.allPages.filter((p) => {
        const depth = new URL(p.url).pathname.split("/").filter(Boolean).length
        return depth >= 4
      })
      if (deepPages.length > 3) {
        findings.push({
          id: "GEO-ADV-006", title: `${deepPages.length} pages are 4+ levels deep in site hierarchy`,
          category: "crawlability", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `${deepPages.length} pages with 4+ path segments found` },
          impact: { search: "medium", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "Pages deep in site hierarchy (4+ levels) receive less PageRank and are crawled less frequently by AI systems. Consider flattening your structure or adding more internal links to deep pages.",
            effort: "large",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // PAGE EXPERIENCE
  // =====================================================================

  // GEO-ADV-007: Missing viewport meta for mobile-first
  engine.register({
    id: "GEO-ADV-007", category: "performance", title: "Site may not be mobile-friendly",
    description: "Mobile-first indexing requires responsive design and proper viewport", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasViewport = ctx.page.meta_tags.some((m) => m.name === "viewport")
      if (!hasViewport) {
        findings.push({
          id: "GEO-ADV-007", title: "Missing viewport meta tag — not mobile-friendly",
          category: "performance", severity: "high", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "No <meta name=\"viewport\" content=\"width=device=device-width, initial-scale=1\"> found" },
          impact: { search: "high", ai_retrieval: "medium", model_training: "none", user_experience: "high" },
          recommendation: {
            action: "fix",
            rationale: "Google uses mobile-first indexing. Without viewport meta tag, your site is not considered mobile-friendly, negatively impacting both traditional and AI search rankings.",
            effort: "trivial",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/mobile-sites/mobile-first-indexing" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // META OPTIMALISATIE
  // =====================================================================

  // GEO-ADV-008: Title missing brand name
  engine.register({
    id: "GEO-ADV-008", category: "entities", title: "Homepage title should include brand name",
    description: "Brand name in title helps AI systems identify the entity", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const title = ctx.page.title
      if (title.length < 10) {
        findings.push({
          id: "GEO-ADV-008", title: "Homepage title too short for brand recognition",
          category: "entities", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Title: "${title}" (${title.length} chars)` },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "AI systems use the homepage title as the primary brand identifier. Include your brand name + key differentiator (e.g., 'Djimit | AI & Data Consultancy').",
            effort: "trivial",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/title-link" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // CONTENT FRESHNESS
  // =====================================================================

  // GEO-ADV-009: No dateModified in structured data
  engine.register({
    id: "GEO-ADV-009", category: "citations", title: "No dateModified in structured data",
    description: "dateModified signals content freshness to AI systems", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 200) return findings
      const hasArticleSchema = hasJsonLdType(ctx.page.jsonld, ["Article", "BlogPosting", "NewsArticle"])
      if (hasArticleSchema) {
        const articleSchema = ctx.page.jsonld.find((j) => {
          if (!j.type) return false
          const types = Array.isArray(j.type) ? j.type : [j.type]
          return types.some((t) => ["Article", "BlogPosting", "NewsArticle"].includes(t))
        })
        const parsed = articleSchema?.parsed as Record<string, unknown> | undefined
        if (!parsed?.dateModified) {
          findings.push({
            id: "GEO-ADV-009", title: "Article schema missing dateModified property",
            category: "citations", severity: "medium", confidence: "high",
            evidence: { url: ctx.page.url, snippet: "Article schema exists but has no dateModified property" },
            impact: { search: "low", ai_retrieval: "high", model_training: "none", user_experience: "none" },
            recommendation: {
              action: "fix",
              rationale: "dateModified is a critical freshness signal for AI systems. Perplexity and Google AI Mode prioritize recent content. Adding dateModified to Article schema increases citation chances for time-sensitive topics.",
              effort: "small",
            },
            sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/article" }],
            rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["ai-search", "google-search"], maintainer: "@opengeo/citations-working-group" },
          })
        }
      }
      return findings
    },
  })

  // =====================================================================
  // OPEN GRAPH VOLLEDIGHEID
  // =====================================================================

  // GEO-ADV-010: Missing og:image
  engine.register({
    id: "GEO-ADV-010", category: "structured-data", title: "Missing og:image for social/AI previews",
    description: "og:image is used by AI systems for rich previews and context", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasOgImage = ctx.page.meta_tags.some((m) => m.name === "og:image")
      if (!hasOgImage) {
        findings.push({
          id: "GEO-ADV-010", title: "Missing og:image meta tag",
          category: "structured-data", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "No <meta property=\"og:image\"> found" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "og:image is used by AI systems (ChatGPT link previews, Perplexity) to generate rich previews. Without it, your content appears less authoritative in AI-generated responses.",
            effort: "small",
          },
          sources: [{ vendor: "OpenAI", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search", "social"], maintainer: "@opengeo/social-working-group" },
        })
      }
      return findings
    },
  })
}

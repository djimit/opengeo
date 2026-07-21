import type { RuleEngine } from "@opengeo/rule-engine"
import type { Finding, NormalizedPageModel } from "@opengeo/shared"

function hasJsonLdType(jsonLd: Array<{ type?: string | string[] }>, targetType: string | string[]): boolean {
  const targets = Array.isArray(targetType) ? targetType : [targetType]
  return jsonLd.some((j) => {
    if (!j.type) return false
    const types = Array.isArray(j.type) ? j.type : [j.type]
    return types.some((t) => targets.includes(t))
  })
}

function isHomepage(ctx: { page: NormalizedPageModel; allPages: NormalizedPageModel[] }): boolean {
  return ctx.page.url === ctx.allPages[0]?.url
}

export function registerStructuredDataRules(engine: RuleEngine): void {

  // =====================================================================
  // STRUCTURED DATA VOLLEDIGHEID
  // =====================================================================

  // GEO-SD-001: Article schema missing required properties
  engine.register({
    id: "GEO-SD-001", category: "structured-data", title: "Article schema missing required properties",
    description: "Complete Article schema is essential for AI citation", enabled: true,
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
        const missing: string[] = []
        if (!parsed?.headline) missing.push("headline")
        if (!parsed?.datePublished) missing.push("datePublished")
        if (!parsed?.author) missing.push("author")
        if (!parsed?.publisher) missing.push("publisher")
        if (!parsed?.image) missing.push("image")
        if (missing.length > 2) {
          findings.push({
            id: "GEO-SD-001", title: `Article schema incomplete: missing ${missing.join(", ")}`,
            category: "structured-data", severity: "medium", confidence: "high",
            evidence: { url: ctx.page.url, snippet: `Article schema found but missing: ${missing.join(", ")}` },
            impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
            recommendation: {
              action: "fix",
              rationale: "Complete Article schema is the strongest signal for AI systems to identify, understand, and cite your content. Missing properties reduce Rich Result eligibility and AI citation chances.",
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

  // GEO-SD-002: Missing BreadcrumbList schema
  engine.register({
    id: "GEO-SD-002", category: "structured-data", title: "Missing BreadcrumbList schema",
    description: "BreadcrumbList helps AI systems understand site hierarchy", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      // Only check subpages (not homepage)
      if (ctx.page.url === ctx.allPages[0]?.url) return findings
      const hasBreadcrumb = hasJsonLdType(ctx.page.jsonld, "BreadcrumbList")
      if (!hasBreadcrumb && ctx.page.word_count > 100) {
        findings.push({
          id: "GEO-SD-002", title: "Missing BreadcrumbList schema on content page",
          category: "structured-data", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No BreadcrumbList schema found — helps AI understand page position in site hierarchy" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "BreadcrumbList schema shows AI systems where this page fits in your site structure. It appears as rich results in Google and helps AI understand content hierarchy.",
            effort: "small",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/breadcrumb" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-SD-003: Missing FAQ schema on FAQ-like content
  engine.register({
    id: "GEO-SD-003", category: "structured-data", title: "FAQ content without FAQ schema",
    description: "FAQ schema helps AI systems extract Q&A pairs for direct answers", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 100) return findings
      const text = ctx.page.text_content.toLowerCase()
      // Detect actual Q&A patterns (not just question marks in navigation/UI)
      const lines = text.split(/[\n.!?]+/).map(l => l.trim()).filter(l => l.length > 10)
      const questionLines = lines.filter((l) =>
        /^(wat|hoe|waarom|wanneer|welke|is|kan|moet|doet|zijn|heeft|biedt|levert)/i.test(l) || l.endsWith("?")
      )
      const hasFaqSchema = hasJsonLdType(ctx.page.jsonld, "FAQPage")
      if (questionLines.length >= 5 && !hasFaqSchema) {
        findings.push({
          id: "GEO-SD-003", title: `Page has ${questionLines.length} questions but no FAQ schema`,
          category: "structured-data", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `Detected ${questionLines.length} question lines — FAQ schema would help AI extract Q&A pairs` },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "FAQ schema tells AI systems exactly which questions you answer. This is the most direct way to appear in AI-generated responses for those questions. AI systems (ChatGPT, Perplexity) actively extract FAQ schema content.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/faqpage" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-SD-004: Missing WebSite schema with SitelinksSearchBox
  engine.register({
    id: "GEO-SD-004", category: "structured-data", title: "Missing WebSite schema with SearchAction",
    description: "WebSite schema enables sitelinks search box in Google", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasWebSite = hasJsonLdType(ctx.page.jsonld, "WebSite")
      if (!hasWebSite) {
        findings.push({
          id: "GEO-SD-004", title: "Homepage missing WebSite schema",
          category: "structured-data", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No WebSite schema found — enables sitelinks search box and brand recognition" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "WebSite schema with PotentialAction (SearchAction) enables the sitelinks search box in Google results. This increases brand visibility and gives AI systems a clear search action for your domain.",
            effort: "small",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-SD-005: Missing Product/Service schema for service pages
  engine.register({
    id: "GEO-SD-005", category: "structured-data", title: "Service page missing Product/Service schema",
    description: "Service schema helps AI systems understand what you offer", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const isServicePage = /\/(diensten|services|oplossingen|solutions|producten|products)\//i.test(ctx.page.url)
      if (!isServicePage) return findings
      const hasSchema = hasJsonLdType(ctx.page.jsonld, ["Product", "Service", "Offer"])
      if (!hasSchema && ctx.page.word_count > 100) {
        findings.push({
          id: "GEO-SD-005", title: "Service/Product page missing structured data",
          category: "structured-data", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "URL suggests service/product page but no Product/Service/Offer schema found" },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "Service and Product schema tell AI systems exactly what you offer, at what price, and with what ratings. This is essential for appearing in AI responses to 'best X service' or 'X provider near me' queries.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/service" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-SD-006: Missing Review/Rating schema
  engine.register({
    id: "GEO-SD-006", category: "structured-data", title: "No Review or AggregateRating schema found",
    description: "Review schema enables star ratings and trust signals", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasReviewSchema = hasJsonLdType(ctx.page.jsonld, ["Review", "AggregateRating"])
      if (!hasReviewSchema) {
        findings.push({
          id: "GEO-SD-006", title: "No Review or AggregateRating schema found",
          category: "structured-data", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No review/rating structured data found — star ratings improve click-through and AI trust" },
          impact: { search: "medium", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "Review and AggregateRating schema enable star ratings in search results. AI systems use rating data to assess quality and trustworthiness. Pages with ratings get higher click-through and citation rates.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/review-snippet" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })
}

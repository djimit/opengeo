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

export function registerEATRules(engine: RuleEngine): void {

  // =====================================================================
  // E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
  // =====================================================================

  // GEO-EAT-001: Missing trust signals
  engine.register({
    id: "GEO-EAT-001", category: "content", title: "No trust signals detected",
    description: "Trust signals (reviews, certifications, awards) improve E-E-A-T score", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const text = ctx.page.text_content.toLowerCase()
      const trustPatterns = /\b(beoordeling|review|ervaring|klant|testimonial|award|prijs|certificering|geaccrediteerd|keurmerk|garantie|trusted|trusted|klantervaring)\b/i
      const hasTrustSchema = hasJsonLdType(ctx.page.jsonld, ["AggregateRating", "Review"])
      if (!trustPatterns.test(text) && !hasTrustSchema) {
        findings.push({
          id: "GEO-EAT-001", title: "No trust signals (reviews, certifications, awards) detected",
          category: "content", severity: "medium", confidence: "low",
          evidence: { url: ctx.page.url, snippet: "No customer reviews, testimonials, certifications, or awards text found" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI systems assess trustworthiness through visible trust signals. Add customer reviews, testimonials, certifications (ISO, BIO), awards, and guarantees. Include AggregateRating schema for rich results.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/guidelines/expertise" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search", "google-search"], maintainer: "@opengeo/eat-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-EAT-002: Missing sameAs social profiles
  engine.register({
    id: "GEO-EAT-002", category: "entities", title: "Organization schema missing sameAs social profiles",
    description: "sameAs links to social profiles establish entity identity for AI systems", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const orgSchema = ctx.page.jsonld.find((j) => {
        if (!j.type) return false
        const types = Array.isArray(j.type) ? j.type : [j.type]
        return types.includes("Organization") || types.includes("LocalBusiness")
      })
      if (orgSchema?.parsed) {
        const parsed = orgSchema.parsed as Record<string, unknown>
        if (!parsed.sameAs && !parsed.same_as) {
          findings.push({
            id: "GEO-EAT-002", title: "Organization schema missing sameAs property",
            category: "entities", severity: "medium", confidence: "high",
            evidence: { url: ctx.page.url, snippet: "Organization/LocalBusiness schema exists but has no sameAs links to social profiles" },
            impact: { search: "low", ai_retrieval: "high", model_training: "none", user_experience: "none" },
            recommendation: {
              action: "fix",
              rationale: "sameAs links (LinkedIn, Twitter/X, Facebook, Instagram) help AI systems confirm entity identity and authority. Without them, AI cannot verify your organization's online presence across platforms.",
              effort: "small",
            },
            sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/organization" }],
            rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["ai-search", "google-search"], maintainer: "@opengeo/eat-working-group" },
          })
        }
      }
      return findings
    },
  })

  // GEO-EAT-003: Missing author credentials
  engine.register({
    id: "GEO-EAT-003", category: "content", title: "Author missing credentials or expertise signals",
    description: "Author credentials signal expertise to AI systems", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 300) return findings
      const hasPersonSchema = hasJsonLdType(ctx.page.jsonld, "Person")
      if (hasPersonSchema) {
        const personSchema = ctx.page.jsonld.find((j) => {
          if (!j.type) return false
          const types = Array.isArray(j.type) ? j.type : [j.type]
          return types.includes("Person")
        })
        const parsed = personSchema?.parsed as Record<string, unknown> | undefined
        const missing: string[] = []
        if (!parsed?.jobTitle) missing.push("jobTitle")
        if (!parsed?.sameAs) missing.push("sameAs (LinkedIn, etc.)")
        if (!parsed?.alumniOf && !parsed?.knowsAbout) missing.push("expertise (knowsAbout/alumniOf)")
        if (missing.length >= 2) {
          findings.push({
            id: "GEO-EAT-003", title: `Person schema missing: ${missing.join(", ")}`,
            category: "content", severity: "medium", confidence: "high",
            evidence: { url: ctx.page.url, snippet: `Person schema found but missing credentials: ${missing.join(", ")}` },
            impact: { search: "low", ai_retrieval: "high", model_training: "none", user_experience: "none" },
            recommendation: {
              action: "fix",
              rationale: "AI systems evaluate author expertise through jobTitle, sameAs (LinkedIn), and knowsAbout properties. Complete Person schema signals E-E-A-T and increases content citation authority.",
              effort: "small",
            },
            sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/person" }],
            rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/eat-working-group" },
          })
        }
      }
      return findings
    },
  })

  // =====================================================================
  // SITE ARCHITECTUUR
  // =====================================================================

  // GEO-ADV-011: Click depth too high
  engine.register({
    id: "GEO-ADV-011", category: "crawlability", title: "Important pages buried too deep",
    description: "Pages 4+ levels deep receive less crawl budget and PageRank", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const deepPages = ctx.allPages.filter((p) => {
        const depth = new URL(p.url).pathname.split("/").filter(Boolean).length
        return depth >= 4
      })
      if (deepPages.length > 5) {
        findings.push({
          id: "GEO-ADV-011", title: `${deepPages.length} pages are 4+ clicks from homepage`,
          category: "crawlability", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Deep pages: ${deepPages.slice(0, 3).map((p) => p.url).join(", ")}` },
          impact: { search: "high", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "Google and AI crawlers distribute PageRank based on click depth. Pages 4+ levels deep receive significantly less authority. Flatten your structure or add more internal links to important deep pages.",
            effort: "large",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-ADV-012: Poor anchor text quality
  engine.register({
    id: "GEO-ADV-012", category: "crawlability", title: "Poor internal link anchor text",
    description: "Anchor text helps AI systems understand linked page content", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const homepage = ctx.allPages[0]
      const poorAnchors = homepage?.links.filter((l) => {
        if (!l.is_internal) return false
        const text = (l.text || "").toLowerCase().trim()
        return text === "" || text === "klik hier" || text === "click here" || text === "lees meer" || text === "read more" || text === "meer" || text === "link"
      }) || []
      if (poorAnchors.length >= 3) {
        findings.push({
          id: "GEO-ADV-012", title: `${poorAnchors.length} internal links use poor anchor text`,
          category: "crawlability", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Poor anchors: ${poorAnchors.slice(0, 5).map((l) => `"${l.text || "(empty)"}" → ${l.href}`).join("; ")}` },
          impact: { search: "medium", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "Anchor text tells AI systems what the linked page is about. Generic anchors ('klik hier', 'lees meer') provide no context. Use descriptive anchors that summarize the target page content.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/guidelines/link-schemes" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // TECHNICAL SEO DIEPTE
  // =====================================================================

  // GEO-TECH-003: Mixed content (HTTP resources on HTTPS page)
  engine.register({
    id: "GEO-TECH-003", category: "security", title: "Potential mixed content (HTTP on HTTPS)",
    description: "Mixed content degrades trust signals and may block rendering", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!ctx.page.url.startsWith("https://")) return findings
      const text = ctx.page.text_content
      const hasHttpResources = /\bhttp:\/\//.test(text) && !/\bhttps:\/\//.test(text)
      if (hasHttpResources) {
        findings.push({
          id: "GEO-TECH-003", title: "Page may contain HTTP resources (mixed content)",
          category: "security", severity: "medium", confidence: "low",
          evidence: { url: ctx.page.url, snippet: "HTTP URLs found in page content — these may cause mixed content warnings" },
          impact: { search: "medium", ai_retrieval: "none", model_training: "none", user_experience: "medium" },
          recommendation: {
            action: "review",
            rationale: "Mixed content (HTTP resources on HTTPS pages) triggers browser warnings and degrades trust signals. AI systems may perceive mixed content sites as less trustworthy. Ensure all resources use HTTPS.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/advanced/security/https" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search"], maintainer: "@opengeo/security-working-group" },
        })
      }
      return findings
    },
  })
}

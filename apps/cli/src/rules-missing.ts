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

export function registerMissingRules(engine: RuleEngine): void {

  // =====================================================================
  // OPEN GRAPH & SOCIAL SIGNALS
  // =====================================================================

  // GEO-SOCIAL-001: Missing Open Graph tags
  engine.register({
    id: "GEO-SOCIAL-001", category: "structured-data", title: "Missing Open Graph tags",
    description: "OG tags provide context for AI systems and social sharing", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const required = ["og:title", "og:description", "og:image", "og:url"]
      const missing = required.filter((tag) => !ctx.page.meta_tags.some((m) => m.name === tag))
      if (missing.length > 0) {
        findings.push({
          id: "GEO-SOCIAL-001", title: `Missing Open Graph tags: ${missing.join(", ")}`,
          category: "structured-data", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Missing: ${missing.join(", ")}` },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "Open Graph tags are used by AI systems (ChatGPT, Claude, Perplexity) to understand page context and generate rich previews. Without them, AI systems rely on content parsing which is less reliable.",
            effort: "small",
          },
          sources: [{ vendor: "OpenAI", type: "official-documentation", url: "https://platform.openai.com/docs" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search", "social"], maintainer: "@opengeo/social-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-SOCIAL-002: Missing Twitter Card tags
  engine.register({
    id: "GEO-SOCIAL-002", category: "structured-data", title: "Missing Twitter Card meta tags",
    description: "Twitter Card data provides additional context for AI systems", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasTwitterCard = ctx.page.meta_tags.some((m) => m.name.startsWith("twitter:"))
      if (!hasTwitterCard) {
        findings.push({
          id: "GEO-SOCIAL-002", title: "No Twitter Card meta tags found",
          category: "structured-data", severity: "low", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "No twitter:card, twitter:title, twitter:description found" },
          impact: { search: "none", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Twitter Card tags provide structured metadata that AI systems can use for content understanding.", effort: "small" },
          sources: [{ vendor: "Twitter", type: "official-documentation" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search", "social"], maintainer: "@opengeo/social-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // IMAGE OPTIMIZATION
  // =====================================================================

  // GEO-IMAGE-001: Images missing alt text (homepage only — sitemap sites need this check)
  engine.register({
    id: "GEO-IMAGE-001", category: "accessibility", title: "Verify images have descriptive alt text",
    description: "Alt text helps AI vision models understand image content", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      // Only flag if we have an og:image (indicating image-heavy site)
      const hasOgImage = ctx.page.meta_tags.some((m) => m.name === "og:image")
      if (hasOgImage) {
        findings.push({
          id: "GEO-IMAGE-001", title: "Verify all images have descriptive alt text",
          category: "accessibility", severity: "low", confidence: "low",
          evidence: { url: ctx.page.url, snippet: "Site uses og:image — verify all images have descriptive alt text for AI vision models" },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI vision models (GPT-4V, Gemini Vision) use alt text to understand image content. Missing alt text means AI systems cannot interpret your images, reducing chances of appearing in AI-generated responses that include visual context.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/google-images" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/accessibility-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // TITLE & META DESCRIPTION OPTIMALISATIE
  // =====================================================================

  // GEO-ENTITY-005: Page title too long or too short
  engine.register({
    id: "GEO-ENTITY-005", category: "entities", title: "Page title length not optimal",
    description: "Title tags should be 30-60 characters for optimal AI citation", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const title = ctx.page.title
      // Only flag extreme cases (< 10 or > 80) to avoid noise on subpages
      if (title && (title.length < 10 || title.length > 80)) {
        findings.push({
          id: "GEO-ENTITY-005", title: `Title tag is ${title.length} chars (optimal: 30-60)`,
          category: "entities", severity: "low", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Title (${title.length} chars): "${title.slice(0, 50)}..."` },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "AI systems use page titles as primary context signal. Titles that are too short lack context; too long get truncated in AI responses. Optimal length is 30-60 characters.",
            effort: "trivial",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/title-link" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-ENTITY-006: Meta description too long or too short
  engine.register({
    id: "GEO-ENTITY-006", category: "entities", title: "Meta description length not optimal",
    description: "Meta descriptions should be 120-160 characters for optimal AI citation", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const desc = ctx.page.meta_description
      if (desc && (desc.length < 50 || desc.length > 170)) {
        findings.push({
          id: "GEO-ENTITY-006", title: `Meta description is ${desc.length} chars (optimal: 120-160)`,
          category: "entities", severity: "low", confidence: "high",
          evidence: { url: ctx.page.url, snippet: `Description (${desc.length} chars): "${desc.slice(0, 60)}..."` },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "AI systems use meta descriptions for snippet generation. Too short lacks context; too long gets truncated. Optimal is 120-160 characters.",
            effort: "trivial",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/snippet#meta-descriptions" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // CONTENT QUALITY & E-E-A-T
  // =====================================================================

  // GEO-CONTENT-004: Missing Article schema on blog posts
  engine.register({
    id: "GEO-CONTENT-004", category: "content", title: "Blog post missing Article schema",
    description: "Article schema helps AI systems identify and cite your content", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      // Check if this looks like a blog post (URL contains /blog/ or /artikel/)
      const isBlogPost = /\/(blog|artikel|post|nieuws|news)\//i.test(ctx.page.url) || ctx.page.url.endsWith("/blog")
      if (isBlogPost && ctx.page.word_count > 200) {
        const hasArticleSchema = hasJsonLdType(ctx.page.jsonld, ["Article", "BlogPosting", "NewsArticle"])
        if (!hasArticleSchema) {
          findings.push({
            id: "GEO-CONTENT-004", title: "Blog post without Article structured data",
            category: "content", severity: "medium", confidence: "medium",
            evidence: { url: ctx.page.url, snippet: "URL suggests blog content but no Article/BlogPosting schema found" },
            impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
            recommendation: {
              action: "fix",
              rationale: "Article schema (with headline, datePublished, dateModified, author) is the strongest signal for AI systems to identify citable content. Without it, your blog posts are less likely to be cited by ChatGPT, Claude, Perplexity, and Gemini.",
              effort: "medium",
            },
            sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/article" }],
            rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/content-working-group" },
          })
        }
      }
      return findings
    },
  })

  // GEO-CONTENT-005: Missing Person schema for authors
  engine.register({
    id: "GEO-CONTENT-005", category: "content", title: "Author without Person schema",
    description: "Person schema establishes E-E-A-T signals for AI systems", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count > 300) {
        const hasPersonSchema = hasJsonLdType(ctx.page.jsonld, "Person")
        const hasAuthorMeta = ctx.page.meta_tags.some((m) => m.name === "author" || m.name === "article:author")
        if (!hasPersonSchema && !hasAuthorMeta) {
          findings.push({
            id: "GEO-CONTENT-005", title: "Content page missing author identification",
            category: "content", severity: "medium", confidence: "medium",
            evidence: { url: ctx.page.url, snippet: "No author meta tag or Person schema found on content page" },
            impact: { search: "low", ai_retrieval: "high", model_training: "none", user_experience: "none" },
            recommendation: {
              action: "fix",
              rationale: "AI systems assess content credibility through author attribution. Person schema with name, jobTitle, sameAs (LinkedIn, Google Scholar) signals expertise and trustworthiness — key factors in E-E-A-T evaluation.",
              effort: "small",
            },
            sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/person" }],
            rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/content-working-group" },
          })
        }
      }
      return findings
    },
  })

  // =====================================================================
  // MOBILE & TECHNICAL
  // =====================================================================

  // GEO-TECH-001: Missing viewport meta tag
  engine.register({
    id: "GEO-TECH-001", category: "performance", title: "Missing viewport meta tag",
    description: "Viewport meta is required for mobile-first indexing", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasViewport = ctx.page.meta_tags.some((m) => m.name === "viewport")
      if (!hasViewport) {
        findings.push({
          id: "GEO-TECH-001", title: "Missing viewport meta tag",
          category: "performance", severity: "high", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "No <meta name=\"viewport\"> tag found" },
          impact: { search: "high", ai_retrieval: "medium", model_training: "none", user_experience: "high" },
          recommendation: {
            action: "fix",
            rationale: "Google uses mobile-first indexing. Without viewport meta tag, your site is not considered mobile-friendly, which negatively impacts ranking in both traditional and AI search results.",
            effort: "trivial",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/mobile-sites/mobile-first-indexing" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/performance-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-TECH-002: Missing lang attribute
  engine.register({
    id: "GEO-TECH-002", category: "accessibility", title: "Missing or invalid lang attribute",
    description: "Language attribute helps AI systems understand content language", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      // Check if lang is mentioned in meta tags or if we can infer from content
      const hasLangMeta = ctx.page.meta_tags.some((m) => m.name === "lang" || m.name === "og:locale")
      if (!hasLangMeta) {
        findings.push({
          id: "GEO-TECH-002", title: "Verify HTML lang attribute is present",
          category: "accessibility", severity: "low", confidence: "low",
          evidence: { url: ctx.page.url, snippet: "No og:locale or lang meta tag found — verify <html lang=\"...\"> attribute" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "The lang attribute helps AI systems understand which language your content is in, affecting which queries your content appears for in AI search results.",
            effort: "trivial",
          },
          sources: [{ vendor: "W3C", type: "official-documentation", url: "https://www.w3.org/International/questions/qa-html-language-declarations" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["general"], maintainer: "@opengeo/accessibility-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // CANONICAL & DUPLICATE CONTENT
  // =====================================================================

  // GEO-CRAWL-011: Canonical points to different domain
  engine.register({
    id: "GEO-CRAWL-011", category: "crawlability", title: "Canonical URL issues",
    description: "Self-referencing canonical URLs confirm page identity to AI crawlers", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      const canonical = ctx.page.canonical
      if (canonical) {
        try {
          const canonicalHost = new URL(canonical).hostname
          const pageHost = new URL(ctx.page.url).hostname
          if (canonicalHost !== pageHost) {
            findings.push({
              id: "GEO-CRAWL-011", title: "Canonical points to different domain",
              category: "crawlability", severity: "high", confidence: "high",
              evidence: { url: ctx.page.url, snippet: `Canonical (${canonical}) differs from page URL (${ctx.page.url})` },
              impact: { search: "high", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
              recommendation: {
                action: "fix",
                rationale: "Cross-domain canonical tells AI crawlers that the canonical version is elsewhere. This means AI systems may attribute content authority to the other domain, reducing your visibility.",
                effort: "small",
              },
              sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls" }],
              rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
            })
          }
        } catch {
          // Invalid URL — ignore
        }
      }
      return findings
    },
  })

  // =====================================================================
  // STRUCTURED DATA UITBREIDING
  // =====================================================================

  // GEO-DATA-006: Missing Article schema on homepage (Organization is there but Article is better for content pages)
  engine.register({
    id: "GEO-DATA-006", category: "structured-data", title: "Consider adding Speakable schema",
    description: "Speakable schema helps voice assistants and AI systems identify key content", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      const hasSpeakable = ctx.page.jsonld.some((j) => j.raw.includes("speakable"))
      if (!hasSpeakable && ctx.page.word_count > 500) {
        findings.push({
          id: "GEO-DATA-006", title: "Consider adding Speakable schema for voice/AI search",
          category: "structured-data", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No Speakable schema found — helps AI voice assistants identify key content sections" },
          impact: { search: "none", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "Speakable schema tells AI voice assistants (Siri, Alexa, Google Assistant) and AI search systems which sections of your content are most suitable for audio responses.",
            effort: "small",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/speakable" }],
          rule_metadata: { status: "experimental", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "voice-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // SITEMAP & INDEXING
  // =====================================================================

  // GEO-CRAWL-012: Sitemap coverage check
  engine.register({
    id: "GEO-CRAWL-012", category: "crawlability", title: "Sitemap coverage may be incomplete",
    description: "All important pages should be in the sitemap for AI crawler discovery", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      // If we crawled pages that weren't in the sitemap, flag it
      const sitemapUrls = new Set<string>()
      // This is a heuristic — if we found pages via internal links that are deep, they might not be in sitemap
      const deepPages = ctx.allPages.filter((p) => {
        const pathDepth = new URL(p.url).pathname.split("/").filter(Boolean).length
        return pathDepth >= 3
      })
      if (deepPages.length > 5) {
        findings.push({
          id: "GEO-CRAWL-012", title: "Deep pages may not be in sitemap",
          category: "crawlability", severity: "low", confidence: "low",
          evidence: { url: ctx.page.url, snippet: `${deepPages.length} pages with 3+ path levels found — verify they are in sitemap.xml` },
          impact: { search: "medium", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI crawlers rely heavily on sitemaps for discovery. Deep pages (3+ levels) not in the sitemap may be missed by AI systems, reducing content visibility.",
            effort: "small",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // CONTENT FRESHNESS
  // =====================================================================

  // GEO-CITE-003: Content may be outdated
  engine.register({
    id: "GEO-CITE-003", category: "citations", title: "Content freshness cannot be verified",
    description: "AI systems prefer fresh content with visible update dates", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 300) return findings
      const hasDateInMeta = ctx.page.has_date_in_meta === true
      const hasTimeElement = ctx.page.has_time_element === true
      const hasDateInJsonLd = ctx.page.jsonld.some((j) => j.parsed?.dateModified || j.parsed?.datePublished)
      if (!hasDateInMeta && !hasTimeElement && !hasDateInJsonLd) {
        findings.push({
          id: "GEO-CITE-003", title: "No freshness signals (dateModified) found",
          category: "citations", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No dateModified in structured data, meta tags, or time elements" },
          impact: { search: "low", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "fix",
            rationale: "AI systems (especially Perplexity and Google AI Mode) prioritize fresh content. Adding dateModified to Article schema and visible update dates signals content recency, increasing citation chances.",
            effort: "small",
          },
          sources: [{ vendor: "Microsoft", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/citations-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // INTERNAL LINKING
  // =====================================================================

  // GEO-CRAWL-013: Poor internal link depth
  engine.register({
    id: "GEO-CRAWL-013", category: "crawlability", title: "Pages too many clicks from homepage",
    description: "Pages deep in site hierarchy get less PageRank and AI crawler attention", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (!isHomepage(ctx)) return findings
      // Check if homepage has enough internal links
      const homepage = ctx.allPages[0]
      const internalLinkCount = homepage?.links.filter((l) => l.is_internal).length || 0
      if (internalLinkCount < 5 && ctx.allPages.length > 3) {
        findings.push({
          id: "GEO-CRAWL-013", title: "Homepage has few internal links",
          category: "crawlability", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `Homepage has only ${internalLinkCount} internal links for ${ctx.allPages.length} crawled pages` },
          impact: { search: "medium", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI crawlers follow internal links to discover content. Few internal links on homepage means deep pages may not be discovered. Aim for at least 10-20 internal links from homepage to important pages.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })
}

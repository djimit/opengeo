/**
 * OpenGEO Rule Evaluation Script (runs against built dist)
 *
 * Usage: node benchmarks/eval.mjs
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, "..", "fixtures", "sites")
const CORPUS_FILE = join(__dirname, "corpus.jsonl")

function loadCorpus() {
  const raw = readFileSync(CORPUS_FILE, "utf-8")
  return raw.split("\n").filter((l) => l.trim()).map((line) => JSON.parse(line))
}

function loadFixtureHtml(fixture) {
  // Fixture paths in corpus are relative to repo root: "fixtures/sites/xxx/"
  const repoRoot = join(__dirname, "..")
  const fixtureDir = join(repoRoot, fixture)
  const htmlPath = join(fixtureDir, "index.html")
  try {
    return readFileSync(htmlPath, "utf-8")
  } catch {
    return ""
  }
}

function htmlToPageModel(html, url) {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i)
  const robotsContent = robotsMatch?.[1] ?? ""
  const noindex = robotsContent.toLowerCase().includes("noindex")

  const headings = []
  const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi
  let hMatch
  while ((hMatch = headingRegex.exec(html)) !== null) {
    headings.push({ level: parseInt(hMatch[1], 10), text: hMatch[2].trim() })
  }

  const jsonld = []
  const jsonldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let jMatch
  while ((jMatch = jsonldRegex.exec(html)) !== null) {
    const raw = jMatch[1].trim()
    try {
      const parsed = JSON.parse(raw)
      jsonld.push({ type: parsed["@type"], raw })
    } catch {
      jsonld.push({ raw })
    }
  }

  const metaTags = []
  const metaRegex = /<meta[^>]*name=["']([^"']*)["'][^>]*content=["']([^"']*)["']/gi
  let mMatch
  while ((mMatch = metaRegex.exec(html)) !== null) {
    metaTags.push({ name: mMatch[1], content: mMatch[2] })
  }

  const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const wordCount = textContent.split(/\s+/).filter(Boolean).length
  const hasTimeElement = /<time[^>]*datetime=/i.test(html)
  const hasDateInMeta = metaTags.some((m) => m.name.includes("date") || m.name.includes("modified") || m.name.includes("published"))

  return {
    url, final_url: url, status_code: 200, content_type: "text/html",
    title: titleMatch?.[1]?.trim() ?? "",
    meta_description: descMatch?.[1],
    canonical: canonicalMatch?.[1],
    robots_directives: robotsContent ? robotsContent.split(",").map((d) => d.trim()) : [],
    noindex, nofollow: false, headers: [], meta_tags: metaTags, headings, links: [], jsonld,
    html_length: html.length, text_content: textContent, word_count: wordCount,
    crawled_at: new Date().toISOString(), render_method: "static",
    has_time_element: hasTimeElement,
    has_date_in_meta: hasDateInMeta,
  }
}

async function runEval() {
  const { RuleEngine } = await import("../packages/rule-engine/dist/index.js")
  const corpus = loadCorpus()
  const engine = new RuleEngine()

  // Register MVP rules inline (avoid CLI import)
  registerMvpRulesInline(engine)

  const results = []

  for (const testCase of corpus) {
    const html = loadFixtureHtml(testCase.site_fixture)
    if (!html) {
      console.log(`  SKIP  ${testCase.id} — fixture not found`)
      continue
    }

    const url = `https://example.org/${testCase.subcategory}/`
    const page = htmlToPageModel(html, url)
    // Simulate 404 status for the 404 fixture
    if (testCase.subcategory === "404-page") {
      page.status_code = 404
    }
    // Simulate missing security headers for the no-security-headers fixture
    if (testCase.subcategory === "no-security-headers") {
      page.headers = [{ name: "content-type", value: "text/html" }]
    }
    const evalResult = await engine.evaluate({
      page, allPages: [page],
      config: { max_pages: 10, depth: 1, render: "static", policy: "balanced", llm_level: 0 },
    })

    const actualIds = evalResult.findings.map((f) => f.id)
    const expectedId = testCase.expected_finding

    let verdict
    if (expectedId === null) {
      verdict = actualIds.length === 0 ? "PASS_TRUE_NEGATIVE" : "FAIL_FALSE_POSITIVE"
    } else {
      verdict = actualIds.includes(expectedId) ? "PASS" : "FAIL_FALSE_NEGATIVE"
    }

    results.push({ case_id: testCase.id, expected: expectedId, actual: actualIds, verdict })
    const icon = verdict.startsWith("PASS") ? "PASS" : "FAIL"
    console.log(`  ${icon}  ${testCase.id}  expected=${expectedId ?? "none"}  actual=[${actualIds.join(", ")}]`)
  }

  const passed = results.filter((r) => r.verdict.startsWith("PASS")).length
  const failed = results.filter((r) => r.verdict.startsWith("FAIL")).length
  console.log(`\n  Results: ${passed}/${results.length} passed, ${failed} failed`)

  if (failed > 0) {
    console.log("\n  Failures:")
    for (const r of results.filter((r) => r.verdict.startsWith("FAIL"))) {
      console.log(`    ${r.case_id}: ${r.verdict} (expected=${r.expected}, actual=[${r.actual.join(", ")}])`)
    }
    process.exit(1)
  }
}

function registerMvpRulesInline(engine) {
  // GEO-CRAWL-002: Homepage noindex
  engine.register({
    id: "GEO-CRAWL-002", category: "crawlability", title: "Homepage blocked by noindex",
    description: "Detects if the homepage has a noindex directive", enabled: true,
    evaluate(ctx) {
      const findings = []
      if (ctx.page.url !== ctx.page.final_url && ctx.page.url !== ctx.page.final_url + "/") return findings
      if (ctx.page.noindex) {
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

  // GEO-CRAWL-003: Canonical missing
  engine.register({
    id: "GEO-CRAWL-003", category: "crawlability", title: "Canonical URL missing",
    description: "Pages should have a self-referencing canonical URL", enabled: true,
    evaluate(ctx) {
      const findings = []
      if (ctx.page.status_code !== 200) return findings
      if (!ctx.page.canonical) {
        findings.push({
          id: "GEO-CRAWL-003", title: "Page missing canonical URL",
          category: "crawlability", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "No <link rel=\"canonical\"> tag found" },
          impact: { search: "medium", ai_retrieval: "low", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "Canonical URLs help search engines understand the preferred version.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/search-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-DATA-001: No JSON-LD
  engine.register({
    id: "GEO-DATA-001", category: "structured-data", title: "No JSON-LD structured data detected",
    description: "Pages should include Schema.org structured data as JSON-LD", enabled: true,
    evaluate(ctx) {
      const findings = []
      if (ctx.page.status_code !== 200) return findings
      if (ctx.page.jsonld.length === 0) {
        findings.push({
          id: "GEO-DATA-001", title: "No JSON-LD structured data on page",
          category: "structured-data", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "Zero <script type=\"application/ld+json\"> blocks found" },
          impact: { search: "medium", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: { action: "review", rationale: "Structured data helps AI systems understand entities.", effort: "medium" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/structured-data-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-DATA-002: Missing Organization schema
  engine.register({
    id: "GEO-DATA-002", category: "structured-data", title: "Missing Organization schema",
    description: "The site should have an Organization schema", enabled: true,
    evaluate(ctx) {
      const findings = []
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

  // GEO-CONTENT-001: Thin content
  engine.register({
    id: "GEO-CONTENT-001", category: "content", title: "Low word count — thin content risk",
    description: "Pages with very low word count may be considered thin content", enabled: true,
    evaluate(ctx) {
      const findings = []
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

  // GEO-ENTITY-001: Missing title
  engine.register({
    id: "GEO-ENTITY-001", category: "entities", title: "Missing or empty page title",
    description: "Every page should have a descriptive <title> element", enabled: true,
    evaluate(ctx) {
      const findings = []
      if (ctx.page.status_code !== 200) return findings
      if (!ctx.page.title || ctx.page.title.length === 0) {
        findings.push({
          id: "GEO-ENTITY-001", title: "Page has no <title> element",
          category: "entities", severity: "high", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "Empty or missing <title> tag" },
          impact: { search: "high", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "The page title is the primary signal for what a page is about.", effort: "trivial" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/title-link" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-ENTITY-002: Missing meta description
  engine.register({
    id: "GEO-ENTITY-002", category: "entities", title: "Missing meta description",
    description: "Pages should have a meta description", enabled: true,
    evaluate(ctx) {
      const findings = []
      if (ctx.page.status_code !== 200) return findings
      if (!ctx.page.meta_description || ctx.page.meta_description.length === 0) {
        findings.push({
          id: "GEO-ENTITY-002", title: "Page missing meta description",
          category: "entities", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "No <meta name=\"description\"> tag found" },
          impact: { search: "medium", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "Meta descriptions are used by search engines and AI systems as a page summary.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/appearance/snippet#meta-descriptions" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-ENTITY-003: Missing H1
  engine.register({
    id: "GEO-ENTITY-003", category: "entities", title: "Multiple or missing H1 heading",
    description: "Each page should have exactly one H1 heading", enabled: true,
    evaluate(ctx) {
      const findings = []
      if (ctx.page.status_code !== 200) return findings
      const h1s = ctx.page.headings.filter((h) => h.level === 1)
      if (h1s.length === 0) {
        findings.push({
          id: "GEO-ENTITY-003", title: "Page has no H1 heading",
          category: "entities", severity: "medium", confidence: "high",
          evidence: { url: ctx.page.url, snippet: "Zero <h1> elements found" },
          impact: { search: "medium", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "The H1 is the primary heading that communicates page topic.", effort: "small" },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/entities-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CRAWL-004: Non-200 HTTP status
  engine.register({
    id: "GEO-CRAWL-004", category: "crawlability", title: "Non-200 HTTP status code",
    description: "Pages returning error status codes cannot be indexed", enabled: true,
    evaluate(ctx) {
      const findings = []
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

  // GEO-CITE-001: No publication/modification date
  engine.register({
    id: "GEO-CITE-001", category: "citations", title: "No publication or modification date visible",
    description: "Citable content should show when it was published and last updated", enabled: true,
    evaluate(ctx) {
      const findings = []
      if (ctx.page.status_code !== 200) return findings
      if (ctx.page.word_count < 200) return findings
      const hasDateInMeta = ctx.page.has_date_in_meta
      const hasTimeElement = ctx.page.has_time_element
      if (!hasDateInMeta && !hasTimeElement) {
        findings.push({
          id: "GEO-CITE-001", title: "No publication or modification date visible on page",
          category: "citations", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: "No <time datetime=\"...\"> or date meta tag found" },
          impact: { search: "low", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: { action: "fix", rationale: "AI search systems prioritize fresh, dateable content.", effort: "small" },
          sources: [{ vendor: "Microsoft", type: "official-documentation" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["bing", "ai-search"], maintainer: "@opengeo/citations-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-SEC-001: Missing security headers (homepage only)
  engine.register({
    id: "GEO-SEC-001", category: "security", title: "Missing security headers",
    description: "HTTP security headers help protect content and signal quality", enabled: true,
    evaluate(ctx) {
      const findings = []
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

  // GEO-GOV-001: No llms.txt
  engine.register({
    id: "GEO-GOV-001", category: "governance", title: "No llms.txt file detected",
    description: "llms.txt provides AI-specific instructions for content usage", enabled: true,
    evaluate(ctx) {
      const findings = []
      if (ctx.page.url !== ctx.page.final_url && ctx.page.url !== ctx.page.final_url + "/") return findings
      const hasLlmsTxt = ctx.allPages.some((p) => p.url.endsWith("/llms.txt"))
      if (!hasLlmsTxt) {
        findings.push({
          id: "GEO-GOV-001", title: "No llms.txt file found",
          category: "governance", severity: "low", confidence: "medium",
          evidence: { url: `${new URL(ctx.page.url).origin}/llms.txt`, snippet: "No llms.txt file detected at site root" },
          impact: { search: "none", ai_retrieval: "low", model_training: "low", user_experience: "none" },
          recommendation: { action: "inform", rationale: "llms.txt is an emerging convention for communicating AI usage policies. It does not guarantee behavior.", effort: "small" },
          sources: [{ vendor: "llms.txt", type: "community-consensus", url: "https://llmstxt.org/" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-20", applicable_to: ["ai-search"], maintainer: "@opengeo/governance-working-group" },
        })
      }
      return findings
    },
  })
}

runEval()

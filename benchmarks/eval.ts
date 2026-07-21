/**
 * OpenGEO Rule Evaluation Script
 *
 * Runs the MVP rules against test fixtures and validates:
 * - True positives: rule fires when expected
 * - True negatives: rule does NOT fire when not expected
 * - False positives: rule fires when it shouldn't
 * - False negatives: rule doesn't fire when it should
 *
 * Usage: npx tsx benchmarks/eval.ts
 */

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { RuleEngine } from "@opengeo/rule-engine"
import type { Finding, NormalizedPageModel } from "@opengeo/shared"
import { registerMvpRules } from "../apps/cli/src/rules.ts"

interface CorpusCase {
  id: string
  category: string
  subcategory: string
  difficulty: number
  site_fixture: string
  expected_finding: string | null
  severity: string | null
  failure_mode: string
  rationale: string
  validation_status: string
}

interface EvalResult {
  case_id: string
  expected: string | null
  actual: string[]
  verdict: "PASS" | "FAIL_FALSE_NEGATIVE" | "FAIL_FALSE_POSITIVE" | "PASS_TRUE_NEGATIVE"
  severity_match: boolean
}

const FIXTURES_DIR = join(import.meta.dirname, "..", "fixtures", "sites")
const CORPUS_FILE = join(import.meta.dirname, "corpus.jsonl")

function loadCorpus(): CorpusCase[] {
  const raw = readFileSync(CORPUS_FILE, "utf-8")
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => JSON.parse(line) as CorpusCase)
}

function loadFixtureHtml(fixture: string): string {
  const path = join(FIXTURES_DIR, fixture, "index.html")
  try {
    return readFileSync(path, "utf-8")
  } catch {
    return ""
  }
}

function htmlToPageModel(html: string, url: string): NormalizedPageModel {
  // Minimal HTML parser for test fixtures (avoids cheerio dependency in bench)
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i)
  const robotsContent = robotsMatch?.[1] ?? ""
  const noindex = robotsContent.toLowerCase().includes("noindex")
  const nofollow = robotsContent.toLowerCase().includes("nofollow")

  const headings: Array<{ level: number; text: string }> = []
  const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi
  let hMatch
  while ((hMatch = headingRegex.exec(html)) !== null) {
    headings.push({ level: parseInt(hMatch[1]!, 10), text: hMatch[2]!.trim() })
  }

  const jsonld: Array<{ type?: string; raw: string }> = []
  const jsonldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let jMatch
  while ((jMatch = jsonldRegex.exec(html)) !== null) {
    const raw = jMatch[1]!.trim()
    try {
      const parsed = JSON.parse(raw)
      jsonld.push({ type: parsed["@type"], raw })
    } catch {
      jsonld.push({ raw })
    }
  }

  const textContent = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const wordCount = textContent.split(/\s+/).filter(Boolean).length

  return {
    url,
    final_url: url,
    status_code: 200,
    content_type: "text/html",
    title: titleMatch?.[1]?.trim() ?? "",
    meta_description: descMatch?.[1],
    canonical: canonicalMatch?.[1],
    robots_directives: robotsContent ? robotsContent.split(",").map((d) => d.trim()) : [],
    noindex,
    nofollow,
    headers: [],
    meta_tags: [],
    headings,
    links: [],
    jsonld,
    html_length: html.length,
    text_content: textContent,
    word_count: wordCount,
    crawled_at: new Date().toISOString(),
    render_method: "static",
  }
}

function runEval(): void {
  const corpus = loadCorpus()
  const engine = new RuleEngine()
  registerMvpRules(engine)

  const results: EvalResult[] = []

  for (const testCase of corpus) {
    const html = loadFixtureHtml(testCase.site_fixture)
    if (!html) {
      console.log(`  SKIP  ${testCase.id} — fixture not found: ${testCase.site_fixture}`)
      continue
    }

    const page = htmlToPageModel(html, `https://example.org/${testCase.subcategory}/`)
    const findings = engine.evaluate({
      page,
      allPages: [page],
      config: {
        max_pages: 10,
        depth: 1,
        render: "static",
        policy: "balanced",
        llm_level: 0,
      },
    })

    const actualIds = findings.findings.map((f) => f.id)
    const expectedId = testCase.expected_finding

    let verdict: EvalResult["verdict"]
    if (expectedId === null) {
      verdict = actualIds.length === 0 ? "PASS_TRUE_NEGATIVE" : "FAIL_FALSE_POSITIVE"
    } else {
      verdict = actualIds.includes(expectedId) ? "PASS" : "FAIL_FALSE_NEGATIVE"
    }

    results.push({
      case_id: testCase.id,
      expected: expectedId,
      actual: actualIds,
      verdict,
      severity_match: true,
    })

    const icon =
      verdict === "PASS" || verdict === "PASS_TRUE_NEGATIVE" ? "PASS" : "FAIL"
    console.log(`  ${icon}  ${testCase.id}  expected=${expectedId ?? "none"}  actual=[${actualIds.join(", ")}]`)
  }

  const passed = results.filter((r) => r.verdict === "PASS" || r.verdict === "PASS_TRUE_NEGATIVE").length
  const failed = results.filter((r) => r.verdict.startsWith("FAIL")).length
  const total = results.length

  console.log(`\n  Results: ${passed}/${total} passed, ${failed} failed`)

  if (failed > 0) {
    console.log("\n  Failures:")
    for (const r of results.filter((r) => r.verdict.startsWith("FAIL"))) {
      console.log(`    ${r.case_id}: ${r.verdict} (expected=${r.expected}, actual=[${r.actual.join(", ")}])`)
    }
    process.exit(1)
  }
}

runEval()

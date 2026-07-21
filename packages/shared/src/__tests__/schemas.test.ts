import { test } from "node:test"
import assert from "node:assert/strict"
import { FindingSchema, SeveritySchema, FindingCategorySchema } from "../schemas/finding.js"
import { NormalizedPageModelSchema } from "../schemas/page-model.js"

test("FindingSchema: validates valid finding", () => {
  const valid = {
    id: "GEO-CRAWL-001",
    title: "Test finding",
    category: "crawlability",
    severity: "high",
    confidence: "medium",
    evidence: { url: "https://example.org", snippet: "test" },
    impact: { search: "high", ai_retrieval: "medium", model_training: "none", user_experience: "low" },
    recommendation: { action: "fix", rationale: "test rationale", effort: "small" },
    sources: [{ vendor: "Google", type: "official-documentation", url: "https://example.org" }],
    rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-20", applicable_to: ["google-search"], maintainer: "@opengeo/test" },
  }

  const result = FindingSchema.safeParse(valid)
  assert.ok(result.success, `Expected valid, got: ${JSON.stringify(result.error?.issues)}`)
})

test("FindingSchema: rejects missing required fields", () => {
  const invalid = { id: "GEO-CRAWL-001" }
  const result = FindingSchema.safeParse(invalid)
  assert.equal(result.success, false)
})

test("FindingSchema: rejects invalid severity", () => {
  const invalid = {
    id: "TEST-001",
    title: "Test",
    category: "content",
    severity: "invalid",
    confidence: "high",
    evidence: { url: "" },
    impact: { search: "none", ai_retrieval: "none", model_training: "none", user_experience: "none" },
    recommendation: { action: "review", rationale: "test", effort: "small" },
    sources: [{ vendor: "Test", type: "reproducible-test" }],
    rule_metadata: { status: "experimental", evidence_level: "reproducible-test", last_reviewed: "2026-07-20", applicable_to: ["test"], maintainer: "test" },
  }

  const result = FindingSchema.safeParse(invalid)
  assert.equal(result.success, false)
})

test("FindingSchema: rejects invalid ID pattern", () => {
  const invalid = {
    id: "invalid-id",
    title: "Test",
    category: "content",
    severity: "high",
    confidence: "high",
    evidence: { url: "" },
    impact: { search: "none", ai_retrieval: "none", model_training: "none", user_experience: "none" },
    recommendation: { action: "review", rationale: "test", effort: "small" },
    sources: [{ vendor: "Test", type: "reproducible-test" }],
    rule_metadata: { status: "experimental", evidence_level: "reproducible-test", last_reviewed: "2026-07-20", applicable_to: ["test"], maintainer: "test" },
  }

  const result = FindingSchema.safeParse(invalid)
  assert.equal(result.success, false)
})

test("NormalizedPageModelSchema: validates valid model", () => {
  const valid = {
    url: "https://example.org",
    final_url: "https://example.org",
    status_code: 200,
    content_type: "text/html",
    title: "Test",
    robots_directives: [],
    noindex: false,
    nofollow: false,
    headers: [],
    meta_tags: [],
    headings: [],
    links: [],
    jsonld: [],
    html_length: 1000,
    text_content: "test content",
    word_count: 10,
    crawled_at: "2026-07-20T00:00:00Z",
    render_method: "static",
  }

  const result = NormalizedPageModelSchema.safeParse(valid)
  assert.ok(result.success, `Expected valid, got: ${JSON.stringify(result.error?.issues)}`)
})

test("NormalizedPageModelSchema: rejects missing required fields", () => {
  const invalid = { url: "https://example.org" }
  const result = NormalizedPageModelSchema.safeParse(invalid)
  assert.equal(result.success, false)
})

test("SeveritySchema: accepts valid values", () => {
  assert.ok(SeveritySchema.safeParse("critical").success)
  assert.ok(SeveritySchema.safeParse("high").success)
  assert.ok(SeveritySchema.safeParse("medium").success)
  assert.ok(SeveritySchema.safeParse("low").success)
  assert.equal(SeveritySchema.safeParse("invalid").success, false)
})

test("FindingCategorySchema: accepts valid categories", () => {
  assert.ok(FindingCategorySchema.safeParse("crawlability").success)
  assert.ok(FindingCategorySchema.safeParse("structured-data").success)
  assert.ok(FindingCategorySchema.safeParse("content").success)
  assert.ok(FindingCategorySchema.safeParse("security").success)
  assert.equal(FindingCategorySchema.safeParse("invalid").success, false)
})

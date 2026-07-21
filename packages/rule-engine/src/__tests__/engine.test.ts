import { test } from "node:test"
import assert from "node:assert/strict"
import { RuleEngine } from "../engine.js"
import type { Finding } from "@opengeo/shared"

function mockFinding(id: string, severity: Finding["severity"] = "medium"): Finding {
  return {
    id,
    title: `Test ${id}`,
    category: "content",
    severity,
    confidence: "high",
    evidence: { url: "https://example.org", snippet: "test" },
    impact: { search: "low", ai_retrieval: "low", model_training: "none", user_experience: "none" },
    recommendation: { action: "review", rationale: "test", effort: "small" },
    sources: [{ vendor: "Test", type: "reproducible-test" }],
    rule_metadata: { status: "experimental", evidence_level: "reproducible-test", last_reviewed: "2026-07-20", applicable_to: ["test"], maintainer: "test" },
  }
}

test("RuleEngine: register and retrieve a rule", () => {
  const engine = new RuleEngine()
  engine.register({
    id: "TEST-001",
    category: "crawlability",
    title: "Test rule",
    description: "A test rule",
    enabled: true,
    evaluate() {
      return []
    },
  })

  const rule = engine.getRule("TEST-001")
  assert.ok(rule)
  assert.equal(rule!.id, "TEST-001")
  assert.equal(rule!.enabled, true)
})

test("RuleEngine: evaluate rule that returns findings", async () => {
  const engine = new RuleEngine()
  engine.register({
    id: "TEST-002",
    category: "content",
    title: "Test finding",
    description: "Returns a finding",
    enabled: true,
    evaluate(ctx) {
      return [mockFinding("TEST-002")]
    },
  })

  const result = await engine.evaluate({
    page: { url: "https://example.org", final_url: "https://example.org" } as any,
    allPages: [{ url: "https://example.org" } as any],
    config: { max_pages: 10, depth: 1, render: "static", policy: "balanced", llm_level: 0 },
  })

  assert.equal(result.findings.length, 1)
  assert.equal(result.findings[0]!.id, "TEST-002")
  assert.equal(result.rules_evaluated, 1)
})

test("RuleEngine: evaluate rule that returns empty findings", async () => {
  const engine = new RuleEngine()
  engine.register({
    id: "TEST-003",
    category: "content",
    title: "Empty rule",
    description: "Returns nothing",
    enabled: true,
    evaluate() {
      return []
    },
  })

  const result = await engine.evaluate({
    page: { url: "https://example.org" } as any,
    allPages: [],
    config: { max_pages: 10, depth: 1, render: "static", policy: "balanced", llm_level: 0 },
  })

  assert.equal(result.findings.length, 0)
})

test("RuleEngine: disabled rules are not evaluated", async () => {
  const engine = new RuleEngine()
  engine.register({
    id: "TEST-004",
    category: "content",
    title: "Disabled rule",
    description: "Should not fire",
    enabled: false,
    evaluate() {
      return [mockFinding("TEST-004", "high")]
    },
  })

  const result = await engine.evaluate({
    page: { url: "https://example.org" } as any,
    allPages: [],
    config: { max_pages: 10, depth: 1, render: "static", policy: "balanced", llm_level: 0 },
  })

  assert.equal(result.findings.length, 0)
  assert.equal(result.rules_evaluated, 0)
})

test("RuleEngine: rule that throws does not crash engine", async () => {
  const engine = new RuleEngine()
  engine.register({
    id: "TEST-005",
    category: "content",
    title: "Throwing rule",
    description: "Throws an error",
    enabled: true,
    evaluate() {
      throw new Error("Rule evaluation failed")
    },
  })
  engine.register({
    id: "TEST-006",
    category: "content",
    title: "Working rule",
    description: "Works fine",
    enabled: true,
    evaluate() {
      return [mockFinding("TEST-006", "low")]
    },
  })

  const result = await engine.evaluate({
    page: { url: "https://example.org" } as any,
    allPages: [],
    config: { max_pages: 10, depth: 1, render: "static", policy: "balanced", llm_level: 0 },
  })

  assert.equal(result.findings.length, 1)
  assert.equal(result.findings[0]!.id, "TEST-006")
})

test("RuleEngine: unregister a rule", () => {
  const engine = new RuleEngine()
  engine.register({
    id: "TEST-007",
    category: "content",
    title: "To be removed",
    description: "Will be unregistered",
    enabled: true,
    evaluate() { return [] },
  })

  assert.ok(engine.getRule("TEST-007"))
  engine.unregister("TEST-007")
  assert.equal(engine.getRule("TEST-007"), undefined)
})

test("RuleEngine: getEnabledRules filters correctly", () => {
  const engine = new RuleEngine()
  engine.register({ id: "ENABLED-1", category: "content", title: "On", description: "", enabled: true, evaluate() { return [] } })
  engine.register({ id: "DISABLED-1", category: "content", title: "Off", description: "", enabled: false, evaluate() { return [] } })

  const enabled = engine.getEnabledRules()
  assert.equal(enabled.length, 1)
  assert.equal(enabled[0]!.id, "ENABLED-1")
})

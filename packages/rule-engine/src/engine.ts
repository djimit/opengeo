import type {
  Finding,
  FindingCategory,
  NormalizedPageModel,
} from "@opengeo/shared"

export interface RuleContext {
  page: NormalizedPageModel
  allPages: NormalizedPageModel[]
  config: AuditConfig
}

export interface AuditConfig {
  max_pages: number
  depth: number
  render: "static" | "javascript"
  policy: "strict" | "balanced" | "permissive"
  llm_level: 0 | 1 | 2 | 3
}

export interface RuleDefinition {
  id: string
  category: FindingCategory
  title: string
  description: string
  enabled: boolean
  evaluate(ctx: RuleContext): Finding[] | Promise<Finding[]>
}

export interface RuleEngineResult {
  findings: Finding[]
  pages_evaluated: number
  rules_evaluated: number
  duration_ms: number
}

export class RuleEngine {
  private rules: Map<string, RuleDefinition> = new Map()

  register(rule: RuleDefinition): void {
    this.rules.set(rule.id, rule)
  }

  unregister(ruleId: string): void {
    this.rules.delete(ruleId)
  }

  getRule(ruleId: string): RuleDefinition | undefined {
    return this.rules.get(ruleId)
  }

  getAllRules(): RuleDefinition[] {
    return [...this.rules.values()]
  }

  getEnabledRules(): RuleDefinition[] {
    return [...this.rules.values()].filter((r) => r.enabled)
  }

  async evaluate(ctx: RuleContext): Promise<RuleEngineResult> {
    const start = Date.now()
    const rules = this.getEnabledRules()
    const allFindings: Finding[] = []

    for (const rule of rules) {
      try {
        const findings = await rule.evaluate(ctx)
        allFindings.push(...findings)
      } catch {
        // Rule failures are non-fatal — they surface as gaps, not crashes.
      }
    }

    return {
      findings: allFindings,
      pages_evaluated: ctx.allPages.length,
      rules_evaluated: rules.length,
      duration_ms: Date.now() - start,
    }
  }
}

export const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  max_pages: 100,
  depth: 3,
  render: "static",
  policy: "balanced",
  llm_level: 0,
}

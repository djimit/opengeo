export class RuleEngine {
    rules = new Map();
    register(rule) {
        this.rules.set(rule.id, rule);
    }
    unregister(ruleId) {
        this.rules.delete(ruleId);
    }
    getRule(ruleId) {
        return this.rules.get(ruleId);
    }
    getAllRules() {
        return [...this.rules.values()];
    }
    getEnabledRules() {
        return [...this.rules.values()].filter((r) => r.enabled);
    }
    async evaluate(ctx) {
        const start = Date.now();
        const rules = this.getEnabledRules();
        const allFindings = [];
        for (const rule of rules) {
            try {
                const findings = await rule.evaluate(ctx);
                allFindings.push(...findings);
            }
            catch {
                // Rule failures are non-fatal — they surface as gaps, not crashes.
            }
        }
        return {
            findings: allFindings,
            pages_evaluated: ctx.allPages.length,
            rules_evaluated: rules.length,
            duration_ms: Date.now() - start,
        };
    }
}
export const DEFAULT_AUDIT_CONFIG = {
    max_pages: 100,
    depth: 3,
    render: "static",
    policy: "balanced",
    llm_level: 0,
};
//# sourceMappingURL=engine.js.map
import type { Finding, FindingCategory, NormalizedPageModel } from "@opengeo/shared";
export interface RuleContext {
    page: NormalizedPageModel;
    allPages: NormalizedPageModel[];
    config: AuditConfig;
}
export interface AuditConfig {
    max_pages: number;
    depth: number;
    render: "static" | "javascript";
    policy: "strict" | "balanced" | "permissive";
    llm_level: 0 | 1 | 2 | 3;
}
export interface RuleDefinition {
    id: string;
    category: FindingCategory;
    title: string;
    description: string;
    enabled: boolean;
    evaluate(ctx: RuleContext): Finding[] | Promise<Finding[]>;
}
export interface RuleEngineResult {
    findings: Finding[];
    pages_evaluated: number;
    rules_evaluated: number;
    duration_ms: number;
}
export declare class RuleEngine {
    private rules;
    register(rule: RuleDefinition): void;
    unregister(ruleId: string): void;
    getRule(ruleId: string): RuleDefinition | undefined;
    getAllRules(): RuleDefinition[];
    getEnabledRules(): RuleDefinition[];
    evaluate(ctx: RuleContext): Promise<RuleEngineResult>;
}
export declare const DEFAULT_AUDIT_CONFIG: AuditConfig;

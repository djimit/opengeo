import { z } from "zod";
export declare const AuditMetadataSchema: z.ZodObject<{
    target_url: z.ZodString;
    started_at: z.ZodString;
    finished_at: z.ZodString;
    tool_version: z.ZodString;
    pages_crawled: z.ZodNumber;
    rules_evaluated: z.ZodNumber;
    llm_level: z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
}, "strip", z.ZodTypeAny, {
    pages_crawled: number;
    rules_evaluated: number;
    target_url: string;
    started_at: string;
    finished_at: string;
    tool_version: string;
    llm_level: 0 | 1 | 2 | 3;
}, {
    pages_crawled: number;
    rules_evaluated: number;
    target_url: string;
    started_at: string;
    finished_at: string;
    tool_version: string;
    llm_level: 0 | 1 | 2 | 3;
}>;
export type AuditMetadata = z.infer<typeof AuditMetadataSchema>;
export declare const DimensionScoreSchema: z.ZodObject<{
    dimension: z.ZodString;
    score: z.ZodNumber;
    coverage: z.ZodNumber;
    finding_count: z.ZodNumber;
    critical_count: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    dimension: string;
    score: number;
    coverage: number;
    finding_count: number;
    critical_count: number;
}, {
    dimension: string;
    score: number;
    coverage: number;
    finding_count: number;
    critical_count: number;
}>;
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;
export declare const ReportSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        target_url: z.ZodString;
        started_at: z.ZodString;
        finished_at: z.ZodString;
        tool_version: z.ZodString;
        pages_crawled: z.ZodNumber;
        rules_evaluated: z.ZodNumber;
        llm_level: z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
    }, "strip", z.ZodTypeAny, {
        pages_crawled: number;
        rules_evaluated: number;
        target_url: string;
        started_at: string;
        finished_at: string;
        tool_version: string;
        llm_level: 0 | 1 | 2 | 3;
    }, {
        pages_crawled: number;
        rules_evaluated: number;
        target_url: string;
        started_at: string;
        finished_at: string;
        tool_version: string;
        llm_level: 0 | 1 | 2 | 3;
    }>;
    findings: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        category: z.ZodEnum<["crawlability", "structured-data", "content", "citations", "entities", "accessibility", "performance", "security", "governance"]>;
        severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
        confidence: z.ZodEnum<["high", "medium", "low"]>;
        evidence: z.ZodObject<{
            url: z.ZodString;
            lines: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            snippet: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
            raw: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            lines?: string[] | undefined;
            snippet?: string | undefined;
            selector?: string | undefined;
            raw?: string | undefined;
        }, {
            url: string;
            lines?: string[] | undefined;
            snippet?: string | undefined;
            selector?: string | undefined;
            raw?: string | undefined;
        }>;
        impact: z.ZodObject<{
            search: z.ZodEnum<["high", "medium", "low", "none"]>;
            ai_retrieval: z.ZodEnum<["high", "medium", "low", "none"]>;
            model_training: z.ZodEnum<["high", "medium", "low", "none"]>;
            user_experience: z.ZodEnum<["high", "medium", "low", "none"]>;
        }, "strip", z.ZodTypeAny, {
            search: "medium" | "high" | "low" | "none";
            ai_retrieval: "medium" | "high" | "low" | "none";
            model_training: "medium" | "high" | "low" | "none";
            user_experience: "medium" | "high" | "low" | "none";
        }, {
            search: "medium" | "high" | "low" | "none";
            ai_retrieval: "medium" | "high" | "low" | "none";
            model_training: "medium" | "high" | "low" | "none";
            user_experience: "medium" | "high" | "low" | "none";
        }>;
        recommendation: z.ZodObject<{
            action: z.ZodEnum<["review", "fix", "monitor", "inform"]>;
            rationale: z.ZodString;
            effort: z.ZodEnum<["trivial", "small", "medium", "large"]>;
        }, "strip", z.ZodTypeAny, {
            action: "inform" | "review" | "fix" | "monitor";
            rationale: string;
            effort: "medium" | "small" | "trivial" | "large";
        }, {
            action: "inform" | "review" | "fix" | "monitor";
            rationale: string;
            effort: "medium" | "small" | "trivial" | "large";
        }>;
        patch: z.ZodOptional<z.ZodObject<{
            format: z.ZodLiteral<"unified-diff">;
            content: z.ZodString;
            target_file: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            content: string;
            format: "unified-diff";
            target_file?: string | undefined;
        }, {
            content: string;
            format: "unified-diff";
            target_file?: string | undefined;
        }>>;
        sources: z.ZodArray<z.ZodObject<{
            vendor: z.ZodString;
            type: z.ZodEnum<["official-documentation", "reproducible-test", "community-consensus"]>;
            url: z.ZodOptional<z.ZodString>;
            date: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "official-documentation" | "reproducible-test" | "community-consensus";
            vendor: string;
            date?: string | undefined;
            url?: string | undefined;
        }, {
            type: "official-documentation" | "reproducible-test" | "community-consensus";
            vendor: string;
            date?: string | undefined;
            url?: string | undefined;
        }>, "many">;
        rule_metadata: z.ZodObject<{
            status: z.ZodEnum<["verified", "experimental", "deprecated"]>;
            evidence_level: z.ZodEnum<["official-documentation", "reproducible-test", "community-consensus"]>;
            last_reviewed: z.ZodString;
            applicable_to: z.ZodArray<z.ZodString, "many">;
            maintainer: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: "verified" | "experimental" | "deprecated";
            evidence_level: "official-documentation" | "reproducible-test" | "community-consensus";
            last_reviewed: string;
            applicable_to: string[];
            maintainer: string;
        }, {
            status: "verified" | "experimental" | "deprecated";
            evidence_level: "official-documentation" | "reproducible-test" | "community-consensus";
            last_reviewed: string;
            applicable_to: string[];
            maintainer: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        category: "crawlability" | "structured-data" | "content" | "citations" | "entities" | "accessibility" | "performance" | "security" | "governance";
        id: string;
        severity: "medium" | "critical" | "high" | "low";
        confidence: "medium" | "high" | "low";
        evidence: {
            url: string;
            lines?: string[] | undefined;
            snippet?: string | undefined;
            selector?: string | undefined;
            raw?: string | undefined;
        };
        impact: {
            search: "medium" | "high" | "low" | "none";
            ai_retrieval: "medium" | "high" | "low" | "none";
            model_training: "medium" | "high" | "low" | "none";
            user_experience: "medium" | "high" | "low" | "none";
        };
        recommendation: {
            action: "inform" | "review" | "fix" | "monitor";
            rationale: string;
            effort: "medium" | "small" | "trivial" | "large";
        };
        sources: {
            type: "official-documentation" | "reproducible-test" | "community-consensus";
            vendor: string;
            date?: string | undefined;
            url?: string | undefined;
        }[];
        rule_metadata: {
            status: "verified" | "experimental" | "deprecated";
            evidence_level: "official-documentation" | "reproducible-test" | "community-consensus";
            last_reviewed: string;
            applicable_to: string[];
            maintainer: string;
        };
        patch?: {
            content: string;
            format: "unified-diff";
            target_file?: string | undefined;
        } | undefined;
    }, {
        title: string;
        category: "crawlability" | "structured-data" | "content" | "citations" | "entities" | "accessibility" | "performance" | "security" | "governance";
        id: string;
        severity: "medium" | "critical" | "high" | "low";
        confidence: "medium" | "high" | "low";
        evidence: {
            url: string;
            lines?: string[] | undefined;
            snippet?: string | undefined;
            selector?: string | undefined;
            raw?: string | undefined;
        };
        impact: {
            search: "medium" | "high" | "low" | "none";
            ai_retrieval: "medium" | "high" | "low" | "none";
            model_training: "medium" | "high" | "low" | "none";
            user_experience: "medium" | "high" | "low" | "none";
        };
        recommendation: {
            action: "inform" | "review" | "fix" | "monitor";
            rationale: string;
            effort: "medium" | "small" | "trivial" | "large";
        };
        sources: {
            type: "official-documentation" | "reproducible-test" | "community-consensus";
            vendor: string;
            date?: string | undefined;
            url?: string | undefined;
        }[];
        rule_metadata: {
            status: "verified" | "experimental" | "deprecated";
            evidence_level: "official-documentation" | "reproducible-test" | "community-consensus";
            last_reviewed: string;
            applicable_to: string[];
            maintainer: string;
        };
        patch?: {
            content: string;
            format: "unified-diff";
            target_file?: string | undefined;
        } | undefined;
    }>, "many">;
    dimension_scores: z.ZodArray<z.ZodObject<{
        dimension: z.ZodString;
        score: z.ZodNumber;
        coverage: z.ZodNumber;
        finding_count: z.ZodNumber;
        critical_count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        dimension: string;
        score: number;
        coverage: number;
        finding_count: number;
        critical_count: number;
    }, {
        dimension: string;
        score: number;
        coverage: number;
        finding_count: number;
        critical_count: number;
    }>, "many">;
    crawler_policy: z.ZodOptional<z.ZodObject<{
        matrix: z.ZodArray<z.ZodObject<{
            crawler: z.ZodString;
            purpose: z.ZodString;
            current_status: z.ZodString;
            recommendation: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            recommendation: string;
            crawler: string;
            purpose: string;
            current_status: string;
        }, {
            recommendation: string;
            crawler: string;
            purpose: string;
            current_status: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        matrix: {
            recommendation: string;
            crawler: string;
            purpose: string;
            current_status: string;
        }[];
    }, {
        matrix: {
            recommendation: string;
            crawler: string;
            purpose: string;
            current_status: string;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    findings: {
        title: string;
        category: "crawlability" | "structured-data" | "content" | "citations" | "entities" | "accessibility" | "performance" | "security" | "governance";
        id: string;
        severity: "medium" | "critical" | "high" | "low";
        confidence: "medium" | "high" | "low";
        evidence: {
            url: string;
            lines?: string[] | undefined;
            snippet?: string | undefined;
            selector?: string | undefined;
            raw?: string | undefined;
        };
        impact: {
            search: "medium" | "high" | "low" | "none";
            ai_retrieval: "medium" | "high" | "low" | "none";
            model_training: "medium" | "high" | "low" | "none";
            user_experience: "medium" | "high" | "low" | "none";
        };
        recommendation: {
            action: "inform" | "review" | "fix" | "monitor";
            rationale: string;
            effort: "medium" | "small" | "trivial" | "large";
        };
        sources: {
            type: "official-documentation" | "reproducible-test" | "community-consensus";
            vendor: string;
            date?: string | undefined;
            url?: string | undefined;
        }[];
        rule_metadata: {
            status: "verified" | "experimental" | "deprecated";
            evidence_level: "official-documentation" | "reproducible-test" | "community-consensus";
            last_reviewed: string;
            applicable_to: string[];
            maintainer: string;
        };
        patch?: {
            content: string;
            format: "unified-diff";
            target_file?: string | undefined;
        } | undefined;
    }[];
    metadata: {
        pages_crawled: number;
        rules_evaluated: number;
        target_url: string;
        started_at: string;
        finished_at: string;
        tool_version: string;
        llm_level: 0 | 1 | 2 | 3;
    };
    dimension_scores: {
        dimension: string;
        score: number;
        coverage: number;
        finding_count: number;
        critical_count: number;
    }[];
    crawler_policy?: {
        matrix: {
            recommendation: string;
            crawler: string;
            purpose: string;
            current_status: string;
        }[];
    } | undefined;
}, {
    findings: {
        title: string;
        category: "crawlability" | "structured-data" | "content" | "citations" | "entities" | "accessibility" | "performance" | "security" | "governance";
        id: string;
        severity: "medium" | "critical" | "high" | "low";
        confidence: "medium" | "high" | "low";
        evidence: {
            url: string;
            lines?: string[] | undefined;
            snippet?: string | undefined;
            selector?: string | undefined;
            raw?: string | undefined;
        };
        impact: {
            search: "medium" | "high" | "low" | "none";
            ai_retrieval: "medium" | "high" | "low" | "none";
            model_training: "medium" | "high" | "low" | "none";
            user_experience: "medium" | "high" | "low" | "none";
        };
        recommendation: {
            action: "inform" | "review" | "fix" | "monitor";
            rationale: string;
            effort: "medium" | "small" | "trivial" | "large";
        };
        sources: {
            type: "official-documentation" | "reproducible-test" | "community-consensus";
            vendor: string;
            date?: string | undefined;
            url?: string | undefined;
        }[];
        rule_metadata: {
            status: "verified" | "experimental" | "deprecated";
            evidence_level: "official-documentation" | "reproducible-test" | "community-consensus";
            last_reviewed: string;
            applicable_to: string[];
            maintainer: string;
        };
        patch?: {
            content: string;
            format: "unified-diff";
            target_file?: string | undefined;
        } | undefined;
    }[];
    metadata: {
        pages_crawled: number;
        rules_evaluated: number;
        target_url: string;
        started_at: string;
        finished_at: string;
        tool_version: string;
        llm_level: 0 | 1 | 2 | 3;
    };
    dimension_scores: {
        dimension: string;
        score: number;
        coverage: number;
        finding_count: number;
        critical_count: number;
    }[];
    crawler_policy?: {
        matrix: {
            recommendation: string;
            crawler: string;
            purpose: string;
            current_status: string;
        }[];
    } | undefined;
}>;
export type Report = z.infer<typeof ReportSchema>;

import { z } from "zod";
export declare const SeveritySchema: z.ZodEnum<["critical", "high", "medium", "low"]>;
export type Severity = z.infer<typeof SeveritySchema>;
export declare const ConfidenceSchema: z.ZodEnum<["high", "medium", "low"]>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export declare const ImpactLevelSchema: z.ZodEnum<["high", "medium", "low", "none"]>;
export type ImpactLevel = z.infer<typeof ImpactLevelSchema>;
export declare const FindingCategorySchema: z.ZodEnum<["crawlability", "structured-data", "content", "citations", "entities", "accessibility", "performance", "security", "governance"]>;
export type FindingCategory = z.infer<typeof FindingCategorySchema>;
export declare const EvidenceSchema: z.ZodObject<{
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
export type Evidence = z.infer<typeof EvidenceSchema>;
export declare const ImpactSchema: z.ZodObject<{
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
export type Impact = z.infer<typeof ImpactSchema>;
export declare const RecommendationSchema: z.ZodObject<{
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
export type Recommendation = z.infer<typeof RecommendationSchema>;
export declare const PatchSchema: z.ZodObject<{
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
}>;
export type Patch = z.infer<typeof PatchSchema>;
export declare const SourceSchema: z.ZodObject<{
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
}>;
export type Source = z.infer<typeof SourceSchema>;
export declare const RuleMetadataSchema: z.ZodObject<{
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
export type RuleMetadata = z.infer<typeof RuleMetadataSchema>;
export declare const FindingSchema: z.ZodObject<{
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
}>;
export type Finding = z.infer<typeof FindingSchema>;

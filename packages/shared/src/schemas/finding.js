import { z } from "zod";
export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const ImpactLevelSchema = z.enum(["high", "medium", "low", "none"]);
export const FindingCategorySchema = z.enum([
    "crawlability",
    "structured-data",
    "content",
    "citations",
    "entities",
    "accessibility",
    "performance",
    "security",
    "governance",
]);
export const EvidenceSchema = z.object({
    url: z.string(),
    lines: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    selector: z.string().optional(),
    raw: z.string().optional(),
});
export const ImpactSchema = z.object({
    search: ImpactLevelSchema,
    ai_retrieval: ImpactLevelSchema,
    model_training: ImpactLevelSchema,
    user_experience: ImpactLevelSchema,
});
export const RecommendationSchema = z.object({
    action: z.enum(["review", "fix", "monitor", "inform"]),
    rationale: z.string(),
    effort: z.enum(["trivial", "small", "medium", "large"]),
});
export const PatchSchema = z.object({
    format: z.literal("unified-diff"),
    content: z.string(),
    target_file: z.string().optional(),
});
export const SourceSchema = z.object({
    vendor: z.string(),
    type: z.enum([
        "official-documentation",
        "reproducible-test",
        "community-consensus",
    ]),
    url: z.string().optional(),
    date: z.string().optional(),
});
export const RuleMetadataSchema = z.object({
    status: z.enum(["verified", "experimental", "deprecated"]),
    evidence_level: z.enum([
        "official-documentation",
        "reproducible-test",
        "community-consensus",
    ]),
    last_reviewed: z.string(),
    applicable_to: z.array(z.string()),
    maintainer: z.string(),
});
export const FindingSchema = z.object({
    id: z.string().regex(/^GEO-[A-Z]+-\d{3}$/),
    title: z.string().min(1).max(200),
    category: FindingCategorySchema,
    severity: SeveritySchema,
    confidence: ConfidenceSchema,
    evidence: EvidenceSchema,
    impact: ImpactSchema,
    recommendation: RecommendationSchema,
    patch: PatchSchema.optional(),
    sources: z.array(SourceSchema).min(1),
    rule_metadata: RuleMetadataSchema,
});
//# sourceMappingURL=finding.js.map
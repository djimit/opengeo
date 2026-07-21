import { z } from "zod";
import { FindingSchema } from "./finding.js";
export const AuditMetadataSchema = z.object({
    target_url: z.string().url(),
    started_at: z.string(),
    finished_at: z.string(),
    tool_version: z.string(),
    pages_crawled: z.number().int().nonnegative(),
    rules_evaluated: z.number().int().nonnegative(),
    llm_level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});
export const DimensionScoreSchema = z.object({
    dimension: z.string(),
    score: z.number().min(0).max(100),
    coverage: z.number().min(0).max(1),
    finding_count: z.number().int().nonnegative(),
    critical_count: z.number().int().nonnegative(),
});
export const ReportSchema = z.object({
    metadata: AuditMetadataSchema,
    findings: z.array(FindingSchema),
    dimension_scores: z.array(DimensionScoreSchema),
    crawler_policy: z.object({
        matrix: z.array(z.object({
            crawler: z.string(),
            purpose: z.string(),
            current_status: z.string(),
            recommendation: z.string(),
        })),
    }).optional(),
});
//# sourceMappingURL=report.js.map
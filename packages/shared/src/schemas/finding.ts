import { z } from "zod"

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"])
export type Severity = z.infer<typeof SeveritySchema>

export const ConfidenceSchema = z.enum(["high", "medium", "low"])
export type Confidence = z.infer<typeof ConfidenceSchema>

export const ImpactLevelSchema = z.enum(["high", "medium", "low", "none"])
export type ImpactLevel = z.infer<typeof ImpactLevelSchema>

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
])
export type FindingCategory = z.infer<typeof FindingCategorySchema>

export const EvidenceSchema = z.object({
  url: z.string(),
  lines: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  selector: z.string().optional(),
  raw: z.string().optional(),
})
export type Evidence = z.infer<typeof EvidenceSchema>

export const ImpactSchema = z.object({
  search: ImpactLevelSchema,
  ai_retrieval: ImpactLevelSchema,
  model_training: ImpactLevelSchema,
  user_experience: ImpactLevelSchema,
})
export type Impact = z.infer<typeof ImpactSchema>

export const RecommendationSchema = z.object({
  action: z.enum(["review", "fix", "monitor", "inform"]),
  rationale: z.string(),
  effort: z.enum(["trivial", "small", "medium", "large"]),
})
export type Recommendation = z.infer<typeof RecommendationSchema>

export const PatchSchema = z.object({
  format: z.literal("unified-diff"),
  content: z.string(),
  target_file: z.string().optional(),
})
export type Patch = z.infer<typeof PatchSchema>

export const SourceSchema = z.object({
  vendor: z.string(),
  type: z.enum([
    "official-documentation",
    "reproducible-test",
    "community-consensus",
  ]),
  url: z.string().optional(),
  date: z.string().optional(),
})
export type Source = z.infer<typeof SourceSchema>

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
})
export type RuleMetadata = z.infer<typeof RuleMetadataSchema>

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
})
export type Finding = z.infer<typeof FindingSchema>

import { z } from "zod";
export const CrawlerPolicySchema = z.object({
    crawler: z.string(),
    purpose: z.enum([
        "search-indexing",
        "ai-search-retrieval",
        "model-training",
        "archival",
        "commercial-scraping",
        "unknown",
    ]),
    current_status: z.enum(["allowed", "blocked", "rate-limited", "unknown"]),
    recommendation: z.enum(["allow", "block", "rate-limit", "review"]),
    rationale: z.string(),
});
export const PolicyReportSchema = z.object({
    target_url: z.string().url(),
    generated_at: z.string(),
    policies: z.array(CrawlerPolicySchema),
    llms_txt_present: z.boolean(),
    llms_txt_content: z.string().optional(),
});
//# sourceMappingURL=policy.js.map
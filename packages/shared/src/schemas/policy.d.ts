import { z } from "zod";
export declare const CrawlerPolicySchema: z.ZodObject<{
    crawler: z.ZodString;
    purpose: z.ZodEnum<["search-indexing", "ai-search-retrieval", "model-training", "archival", "commercial-scraping", "unknown"]>;
    current_status: z.ZodEnum<["allowed", "blocked", "rate-limited", "unknown"]>;
    recommendation: z.ZodEnum<["allow", "block", "rate-limit", "review"]>;
    rationale: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rationale: string;
    recommendation: "review" | "block" | "allow" | "rate-limit";
    crawler: string;
    purpose: "search-indexing" | "ai-search-retrieval" | "model-training" | "unknown" | "archival" | "commercial-scraping";
    current_status: "unknown" | "allowed" | "blocked" | "rate-limited";
}, {
    rationale: string;
    recommendation: "review" | "block" | "allow" | "rate-limit";
    crawler: string;
    purpose: "search-indexing" | "ai-search-retrieval" | "model-training" | "unknown" | "archival" | "commercial-scraping";
    current_status: "unknown" | "allowed" | "blocked" | "rate-limited";
}>;
export type CrawlerPolicy = z.infer<typeof CrawlerPolicySchema>;
export declare const PolicyReportSchema: z.ZodObject<{
    target_url: z.ZodString;
    generated_at: z.ZodString;
    policies: z.ZodArray<z.ZodObject<{
        crawler: z.ZodString;
        purpose: z.ZodEnum<["search-indexing", "ai-search-retrieval", "model-training", "archival", "commercial-scraping", "unknown"]>;
        current_status: z.ZodEnum<["allowed", "blocked", "rate-limited", "unknown"]>;
        recommendation: z.ZodEnum<["allow", "block", "rate-limit", "review"]>;
        rationale: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        rationale: string;
        recommendation: "review" | "block" | "allow" | "rate-limit";
        crawler: string;
        purpose: "search-indexing" | "ai-search-retrieval" | "model-training" | "unknown" | "archival" | "commercial-scraping";
        current_status: "unknown" | "allowed" | "blocked" | "rate-limited";
    }, {
        rationale: string;
        recommendation: "review" | "block" | "allow" | "rate-limit";
        crawler: string;
        purpose: "search-indexing" | "ai-search-retrieval" | "model-training" | "unknown" | "archival" | "commercial-scraping";
        current_status: "unknown" | "allowed" | "blocked" | "rate-limited";
    }>, "many">;
    llms_txt_present: z.ZodBoolean;
    llms_txt_content: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    target_url: string;
    generated_at: string;
    policies: {
        rationale: string;
        recommendation: "review" | "block" | "allow" | "rate-limit";
        crawler: string;
        purpose: "search-indexing" | "ai-search-retrieval" | "model-training" | "unknown" | "archival" | "commercial-scraping";
        current_status: "unknown" | "allowed" | "blocked" | "rate-limited";
    }[];
    llms_txt_present: boolean;
    llms_txt_content?: string | undefined;
}, {
    target_url: string;
    generated_at: string;
    policies: {
        rationale: string;
        recommendation: "review" | "block" | "allow" | "rate-limit";
        crawler: string;
        purpose: "search-indexing" | "ai-search-retrieval" | "model-training" | "unknown" | "archival" | "commercial-scraping";
        current_status: "unknown" | "allowed" | "blocked" | "rate-limited";
    }[];
    llms_txt_present: boolean;
    llms_txt_content?: string | undefined;
}>;
export type PolicyReport = z.infer<typeof PolicyReportSchema>;

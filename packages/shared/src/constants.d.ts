export declare const TOOL_NAME = "opengeo";
export declare const TOOL_VERSION = "0.1.0";
export declare const TOOL_DESCRIPTION = "Open-source evidence-backed AI Search Readiness Auditor";
export declare const KNOWN_CRAWLERS: readonly [{
    readonly id: "googlebot";
    readonly name: "Googlebot";
    readonly purpose: "search-indexing";
}, {
    readonly id: "bingbot";
    readonly name: "Bingbot";
    readonly purpose: "search-indexing";
}, {
    readonly id: "oai-searchbot";
    readonly name: "OAI-SearchBot";
    readonly purpose: "ai-search-retrieval";
}, {
    readonly id: "gptbot";
    readonly name: "GPTBot";
    readonly purpose: "model-training";
}, {
    readonly id: "ccbot";
    readonly name: "CCBot";
    readonly purpose: "model-training";
}, {
    readonly id: "anthropic-ai";
    readonly name: "anthropic-ai";
    readonly purpose: "model-training";
}, {
    readonly id: "applebot";
    readonly name: "Applebot";
    readonly purpose: "ai-search-retrieval";
}, {
    readonly id: "petalbot";
    readonly name: "PetalBot";
    readonly purpose: "search-indexing";
}, {
    readonly id: "yandexbot";
    readonly name: "YandexBot";
    readonly purpose: "search-indexing";
}, {
    readonly id: "baiduspider";
    readonly name: "Baiduspider";
    readonly purpose: "search-indexing";
}, {
    readonly id: "unknown-ai";
    readonly name: "Unknown-AI-Bot";
    readonly purpose: "unknown";
}];
export declare const SCHEMA_ORG_TYPES: readonly ["Organization", "WebSite", "WebPage", "Article", "Person", "Product", "Service", "FAQPage", "HowTo", "Dataset", "DefinedTerm", "BreadcrumbList"];
export declare const FINDING_ID_PATTERN: RegExp;
export declare const DEFAULT_MAX_PAGES = 100;
export declare const DEFAULT_CRAWL_DEPTH = 3;
export declare const DEFAULT_CONCURRENCY = 5;
export declare const DEFAULT_TIMEOUT_MS = 30000;

export const TOOL_NAME = "opengeo";
export const TOOL_VERSION = "0.1.0";
export const TOOL_DESCRIPTION = "Open-source evidence-backed AI Search Readiness Auditor";
export const KNOWN_CRAWLERS = [
    { id: "googlebot", name: "Googlebot", purpose: "search-indexing" },
    { id: "bingbot", name: "Bingbot", purpose: "search-indexing" },
    { id: "oai-searchbot", name: "OAI-SearchBot", purpose: "ai-search-retrieval" },
    { id: "gptbot", name: "GPTBot", purpose: "model-training" },
    { id: "ccbot", name: "CCBot", purpose: "model-training" },
    { id: "anthropic-ai", name: "anthropic-ai", purpose: "model-training" },
    { id: "applebot", name: "Applebot", purpose: "ai-search-retrieval" },
    { id: "petalbot", name: "PetalBot", purpose: "search-indexing" },
    { id: "yandexbot", name: "YandexBot", purpose: "search-indexing" },
    { id: "baiduspider", name: "Baiduspider", purpose: "search-indexing" },
    { id: "unknown-ai", name: "Unknown-AI-Bot", purpose: "unknown" },
];
export const SCHEMA_ORG_TYPES = [
    "Organization",
    "WebSite",
    "WebPage",
    "Article",
    "Person",
    "Product",
    "Service",
    "FAQPage",
    "HowTo",
    "Dataset",
    "DefinedTerm",
    "BreadcrumbList",
];
export const FINDING_ID_PATTERN = /^GEO-[A-Z]+-\d{3}$/;
export const DEFAULT_MAX_PAGES = 100;
export const DEFAULT_CRAWL_DEPTH = 3;
export const DEFAULT_CONCURRENCY = 5;
export const DEFAULT_TIMEOUT_MS = 30_000;
//# sourceMappingURL=constants.js.map
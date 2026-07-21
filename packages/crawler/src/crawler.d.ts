import type { NormalizedPageModel } from "@opengeo/shared";
export interface CrawlOptions {
    max_pages: number;
    depth: number;
    concurrency: number;
    timeout_ms: number;
    user_agent: string;
    follow_redirects: boolean;
    respect_robots_txt: boolean;
}
export interface CrawlResult {
    pages: NormalizedPageModel[];
    robots_txt: string | null;
    sitemaps: string[];
    errors: Array<{
        url: string;
        error: string;
    }>;
    duration_ms: number;
}
export declare function crawlSite(startUrl: string, options?: Partial<CrawlOptions>): Promise<CrawlResult>;

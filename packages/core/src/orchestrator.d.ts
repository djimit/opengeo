import type { Report, Finding } from "@opengeo/shared";
import { RuleEngine, type AuditConfig } from "@opengeo/rule-engine";
import { type CrawlOptions } from "@opengeo/crawler";
export interface AuditInput {
    url: string;
    config: AuditConfig;
    crawl_options?: Partial<CrawlOptions>;
    rule_registry?: (engine: RuleEngine) => void;
}
export interface AuditOutput {
    report: Report;
    findings: Finding[];
    pages_crawled: number;
    duration_ms: number;
}
export declare function runAudit(input: AuditInput): Promise<AuditOutput>;

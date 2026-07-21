import { RuleEngine } from "@opengeo/rule-engine";
import { crawlSite } from "@opengeo/crawler";
export async function runAudit(input) {
    const start = Date.now();
    const crawlResult = await crawlSite(input.url, {
        max_pages: input.config.max_pages,
        depth: input.config.depth,
        concurrency: 5,
        timeout_ms: 30_000,
        user_agent: "OpenGeoBot/0.1.0 (+https://github.com/DjimIT/opengeo)",
        follow_redirects: true,
        respect_robots_txt: true,
        ...input.crawl_options,
    });
    const engine = new RuleEngine();
    if (input.rule_registry) {
        input.rule_registry(engine);
    }
    const allFindings = [];
    for (const page of crawlResult.pages) {
        const result = await engine.evaluate({
            page,
            allPages: crawlResult.pages,
            config: input.config,
        });
        allFindings.push(...result.findings);
    }
    const duration = Date.now() - start;
    const report = {
        metadata: {
            target_url: input.url,
            started_at: new Date(start).toISOString(),
            finished_at: new Date().toISOString(),
            tool_version: "0.1.0",
            pages_crawled: crawlResult.pages.length,
            rules_evaluated: engine.getEnabledRules().length,
            llm_level: input.config.llm_level,
        },
        findings: allFindings,
        dimension_scores: [],
        crawler_policy: undefined,
    };
    return {
        report,
        findings: allFindings,
        pages_crawled: crawlResult.pages.length,
        duration_ms: duration,
    };
}
//# sourceMappingURL=orchestrator.js.map
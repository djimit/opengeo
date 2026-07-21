#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { TOOL_NAME, TOOL_VERSION, TOOL_DESCRIPTION } from "@opengeo/shared";
import { crawlSite } from "@opengeo/crawler";
import { RuleEngine, DEFAULT_AUDIT_CONFIG } from "@opengeo/rule-engine";
import { generateMarkdownReport, generateJsonReport } from "@opengeo/reporting";
import { registerMvpRules } from "./rules.js";
const program = new Command();
program
    .name(TOOL_NAME)
    .description(TOOL_DESCRIPTION)
    .version(TOOL_VERSION);
program
    .command("audit")
    .description("Run an AI Search Readiness audit on a website")
    .argument("<url>", "Target URL to audit")
    .option("-m, --max-pages <number>", "Maximum pages to crawl", String(DEFAULT_AUDIT_CONFIG.max_pages))
    .option("-d, --depth <number>", "Crawl depth", String(DEFAULT_AUDIT_CONFIG.depth))
    .option("-r, --render <mode>", "Render mode: static or javascript", "static")
    .option("-p, --policy <policy>", "Crawler policy: strict, balanced, permissive", "balanced")
    .option("-o, --output <path>", "Output file path (default: stdout)")
    .option("-f, --format <format>", "Output format: markdown, json", "markdown")
    .action(async (url, opts) => {
    const maxPages = parseInt(opts.max_pages ?? "100", 10);
    const depth = parseInt(opts.depth ?? "3", 10);
    const render = opts.render ?? "static";
    const policy = opts.policy ?? "balanced";
    const format = opts.format ?? "markdown";
    console.log(chalk.blue(`\n  ${chalk.bold(TOOL_NAME)} v${TOOL_VERSION}`));
    console.log(chalk.dim(`  ${TOOL_DESCRIPTION}\n`));
    console.log(chalk.cyan(`  Target: ${url}`));
    console.log(chalk.cyan(`  Pages: ${maxPages} | Depth: ${depth} | Render: ${render} | Policy: ${policy}\n`));
    const spinner = chalk.yellow("  Crawling...");
    console.log(spinner);
    const crawlResult = await crawlSite(url, {
        max_pages: maxPages,
        depth,
        concurrency: 5,
        timeout_ms: 30_000,
        user_agent: `OpenGeoBot/${TOOL_VERSION} (+https://github.com/DjimIT/opengeo)`,
        follow_redirects: true,
        respect_robots_txt: true,
    });
    console.log(chalk.green(`  Crawled ${crawlResult.pages.length} pages in ${crawlResult.duration_ms}ms`));
    if (crawlResult.errors.length > 0) {
        console.log(chalk.yellow(`  ${crawlResult.errors.length} crawl errors (non-fatal)`));
    }
    console.log(chalk.cyan("\n  Evaluating rules..."));
    const engine = new RuleEngine();
    registerMvpRules(engine);
    const allFindings = [];
    for (const page of crawlResult.pages) {
        const result = await engine.evaluate({
            page,
            allPages: crawlResult.pages,
            config: {
                ...DEFAULT_AUDIT_CONFIG,
                max_pages: maxPages,
                depth,
                render,
                policy,
                llm_level: 0,
            },
        });
        allFindings.push(...result.findings);
    }
    console.log(chalk.green(`  Found ${allFindings.length} issues across ${engine.getEnabledRules().length} rules\n`));
    const report = {
        metadata: {
            target_url: url,
            started_at: new Date(Date.now() - crawlResult.duration_ms).toISOString(),
            finished_at: new Date().toISOString(),
            tool_version: TOOL_VERSION,
            pages_crawled: crawlResult.pages.length,
            rules_evaluated: engine.getEnabledRules().length,
            llm_level: 0,
        },
        findings: allFindings,
        dimension_scores: [],
        crawler_policy: undefined,
    };
    let output;
    if (format === "json") {
        output = generateJsonReport(report);
    }
    else {
        output = generateMarkdownReport(report);
    }
    if (opts.output) {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(opts.output, output, "utf-8");
        console.log(chalk.green(`  Report written to ${opts.output}`));
    }
    else {
        console.log(output);
    }
    const critical = allFindings.filter((f) => f.severity === "critical").length;
    const high = allFindings.filter((f) => f.severity === "high").length;
    const medium = allFindings.filter((f) => f.severity === "medium").length;
    const low = allFindings.filter((f) => f.severity === "low").length;
    console.log(chalk.bold("\n  Summary:"));
    if (critical > 0)
        console.log(chalk.red(`    Critical: ${critical}`));
    if (high > 0)
        console.log(chalk.yellow(`    High: ${high}`));
    if (medium > 0)
        console.log(chalk.blue(`    Medium: ${medium}`));
    if (low > 0)
        console.log(chalk.dim(`    Low: ${low}`));
    console.log();
});
program.parse();
//# sourceMappingURL=index.js.map
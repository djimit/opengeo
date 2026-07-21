#!/usr/bin/env node
import { Command } from "commander"
import chalk from "chalk"
import { TOOL_NAME, TOOL_VERSION, TOOL_DESCRIPTION } from "@opengeo/shared"
import { crawlSite } from "@opengeo/crawler"
import { RuleEngine, DEFAULT_AUDIT_CONFIG } from "@opengeo/rule-engine"
import { generateMarkdownReport, generateJsonReport, generateSarifReport } from "@opengeo/reporting"
import { generateAllPatches } from "@opengeo/patch-generator"
import { DjimitfloBridge } from "@opengeo/bridge"
import { createLLMProvider } from "@opengeo/llm-provider"
import { join } from "node:path"
import { registerMvpRules } from "./rules.js"
import { registerExtendedRules } from "./rules-extra.js"
import { registerMissingRules } from "./rules-missing.js"
import { registerAdvancedRules } from "./rules-advanced.js"
import { registerContentQualityRules } from "./rules-content-quality.js"
import { registerEATRules } from "./rules-eat.js"
import { registerStructuredDataRules } from "./rules-structured-data.js"

interface AuditOptions {
  max_pages?: string
  depth?: string
  render?: "static" | "javascript"
  policy?: "strict" | "balanced" | "permissive"
  output?: string
  format?: string
  locale?: string
  sync_djimitflo?: string
  djimitflo_url?: string
  djimitflo_token?: string
}

const program = new Command()

program
  .name(TOOL_NAME)
  .description(TOOL_DESCRIPTION)
  .version(TOOL_VERSION)

program
  .command("audit")
  .description("Run an AI Search Readiness audit on a website")
  .argument("<url>", "Target URL to audit")
  .option("-m, --max-pages <number>", "Maximum pages to crawl", String(DEFAULT_AUDIT_CONFIG.max_pages))
  .option("-d, --depth <number>", "Crawl depth", String(DEFAULT_AUDIT_CONFIG.depth))
  .option("-r, --render <mode>", "Render mode: static or javascript", "static")
  .option("-p, --policy <policy>", "Crawler policy: strict, balanced, permissive", "balanced")
  .option("-o, --output <path>", "Output file path (default: stdout)")
  .option("-f, --format <format>", "Output format: markdown, json, sarif", "markdown")
  .option("--locale <locale>", "Output locale: en, nl, de, fr", "en")
  .option("--llm-level <level>", "LLM level: 0 (none), 1 (embedding), 2 (local LLM), 3 (external API)", "0")
  .option("--ollama-url <url>", "Ollama server URL (default: http://localhost:11434)")
  .option("--ollama-model <model>", "Ollama model name")
  .option("--api-key <key>", "External API key (Level 3)")
  .option("--api-base-url <url>", "External API base URL (default: https://api.openai.com/v1)")
  .option("--api-model <model>", "External API model (default: gpt-4o-mini)")
  .option("--sync-djimitflo <taskId>", "Sync findings to Djimitflo evidence store")
  .option("--djimitflo-url <url>", "Djimitflo server URL (default: http://localhost:3001)")
  .option("--djimitflo-token <token>", "Djimitflo auth token")
  .action(async (url: string, opts: AuditOptions) => {
    const maxPages = parseInt(opts.max_pages ?? "100", 10)
    const depth = parseInt(opts.depth ?? "3", 10)
    const render = opts.render ?? "static"
    const policy = opts.policy ?? "balanced"
    const format = opts.format ?? "markdown"

    console.log(chalk.blue(`\n  ${chalk.bold(TOOL_NAME)} v${TOOL_VERSION}`))
    console.log(chalk.dim(`  ${TOOL_DESCRIPTION}\n`))
    console.log(chalk.cyan(`  Target: ${url}`))
    console.log(chalk.cyan(`  Pages: ${maxPages} | Depth: ${depth} | Render: ${render} | Policy: ${policy}\n`))

    const spinner = chalk.yellow("  Crawling...")
    console.log(spinner)

    const crawlResult = await crawlSite(url, {
      max_pages: maxPages,
      depth,
      concurrency: 5,
      timeout_ms: 30_000,
      user_agent: `OpenGeoBot/${TOOL_VERSION} (+https://github.com/DjimIT/opengeo)`,
      follow_redirects: true,
      respect_robots_txt: true,
    })

    console.log(chalk.green(`  Crawled ${crawlResult.pages.length} pages in ${crawlResult.duration_ms}ms`))
    if (crawlResult.errors.length > 0) {
      console.log(chalk.yellow(`  ${crawlResult.errors.length} crawl errors (non-fatal)`))
    }
    if (crawlResult.crawl_blocked) {
      console.log(chalk.red(`\n  ⚠️  COULD NOT CRAWL — Server protocol error`))
      console.log(chalk.dim(`  The server returns malformed HTTP headers that violate the HTTP/1.1 protocol.`))
      console.log(chalk.dim(`  This blocks ALL AI crawlers (ChatGPT, Claude, Perplexity, Gemini, Google).\n`))
      console.log(chalk.yellow(`  🔴 CRITICAL for AI Search Visibility:`))
      console.log(chalk.dim(`  • AI crawlers cannot access your content → zero AI visibility`))
      console.log(chalk.dim(`  • Search engines may de-index your site due to crawl failures`))
      console.log(chalk.dim(`  • Your content cannot appear in ChatGPT, Claude, Perplexity, or Gemini\n`))
      console.log(chalk.yellow(`  🔧 Server-side fixes:`))
      console.log(chalk.dim(`  1. Check web server (Apache/Nginx) header configuration`))
      console.log(chalk.dim(`  2. Check CDN/WAF (Cloudflare) edge rules for header modification`))
      console.log(chalk.dim(`  3. Verify SSL/TLS termination at load balancer`))
      console.log(chalk.dim(`  4. Test: curl -v https://agenticservices.nl/ 2>&1 | head -30`))
      console.log(chalk.dim(`  5. Expected: proper "HTTP/1.1 200 OK" with CR/LF line endings\n`))
    }

    console.log(chalk.cyan("\n  Evaluating rules..."))

    const engine = new RuleEngine()
    registerMvpRules(engine)
    registerExtendedRules(engine)
    registerMissingRules(engine)
    registerAdvancedRules(engine)
    registerContentQualityRules(engine)
    registerEATRules(engine)
    registerStructuredDataRules(engine)

    const allFindings = []
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
          llm_level: 0 as const,
        },
      })
      allFindings.push(...result.findings)
    }

    // Deduplicate: remove findings with same id + same evidence.url
    const seen = new Set<string>()
    const dedupedFindings = allFindings.filter((f) => {
      const key = `${f.id}::${f.evidence.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    if (dedupedFindings.length < allFindings.length) {
      console.log(chalk.dim(`  Deduplicated ${allFindings.length} → ${dedupedFindings.length} findings`))
    }
    console.log(chalk.green(`  Found ${dedupedFindings.length} issues across ${engine.getEnabledRules().length} rules\n`))

    const report = {
      metadata: {
        target_url: url,
        started_at: new Date(Date.now() - crawlResult.duration_ms).toISOString(),
        finished_at: new Date().toISOString(),
        tool_version: TOOL_VERSION,
        pages_crawled: crawlResult.pages.length,
        rules_evaluated: engine.getEnabledRules().length,
        llm_level: 0 as 0 | 1 | 2 | 3,
      },
      findings: dedupedFindings,
      dimension_scores: [],
      crawler_policy: undefined,
    }

    const locale = (opts.locale ?? "en") as "en" | "nl" | "de" | "fr"

    let output: string
    if (format === "json") {
      output = generateJsonReport(report)
    } else if (format === "sarif") {
      output = generateSarifReport(report)
    } else {
      output = generateMarkdownReport(report, locale)
    }

    if (opts.output) {
      const { writeFile } = await import("node:fs/promises")
      await writeFile(opts.output, output, "utf-8")
      console.log(chalk.green(`  Report written to ${opts.output}`))
    } else {
      console.log(output)
    }

    if (format === "markdown") {
      const patches = generateAllPatches(dedupedFindings, crawlResult.pages)
      if (patches.length > 0) {
        console.log(chalk.bold(`\n  Patches (${patches.length} available):`))
        for (const p of patches) {
          console.log(chalk.dim(`\n  [${p.rule_id}] ${p.target_url}`))
          console.log(chalk.dim(`  File: ${p.target_file} | Confidence: ${p.confidence}`))
          for (const line of p.patch.split("\n")) {
            const colored = line.startsWith("+")
              ? chalk.green(line)
              : line.startsWith("-")
                ? chalk.red(line)
                : chalk.dim(line)
            console.log(`    ${colored}`)
          }
        }
        console.log()
      }
    }

    const critical = dedupedFindings.filter((f) => f.severity === "critical").length
    const high = dedupedFindings.filter((f) => f.severity === "high").length
    const medium = dedupedFindings.filter((f) => f.severity === "medium").length
    const low = dedupedFindings.filter((f) => f.severity === "low").length

    if (opts.sync_djimitflo) {
      const bridge = new DjimitfloBridge({
        djimitflo_url: opts.djimitflo_url ?? "http://localhost:3001",
        auth_token: opts.djimitflo_token ?? "",
        task_id: opts.sync_djimitflo,
      })
      console.log(chalk.cyan(`  Syncing ${dedupedFindings.length} findings to Djimitflo...`))
      await bridge.syncReport(report, crawlResult.pages.length, crawlResult.duration_ms)
      await bridge.syncAllFindings(report)
      console.log(chalk.green("  Sync complete"))
    }

    console.log(chalk.bold("\n  Summary:"))
    if (critical > 0) console.log(chalk.red(`    Critical: ${critical}`))
    if (high > 0) console.log(chalk.yellow(`    High: ${high}`))
    if (medium > 0) console.log(chalk.blue(`    Medium: ${medium}`))
    if (low > 0) console.log(chalk.dim(`    Low: ${low}`))
    console.log()
  })

program
  .command("serve")
  .description("Start the OpenGEO dashboard web interface")
  .option("-p, --port <number>", "Port to serve on", "3000")
  .action(async (opts: { port?: string }) => {
    const port = parseInt(opts.port ?? "3000", 10)
    console.log(chalk.blue(`\n  ${chalk.bold(TOOL_NAME)} v${TOOL_VERSION}`))
    console.log(chalk.cyan(`  Starting dashboard on http://localhost:${port}\n`))

    // Resolve repo root: CLI is at apps/cli/dist/index.js, repo root is 3 levels up
    const repoRoot = join(__dirname, "..", "..", "..")
    const dashboardPath = join(repoRoot, "apps", "dashboard")

    const { spawn } = await import("node:child_process")
    const child = spawn("npx", ["next", "dev", "-p", String(port)], {
      cwd: dashboardPath,
      stdio: "inherit",
      env: { ...process.env },
    })

    child.on("error", () => {
      console.log(chalk.red("  Failed to start dashboard. Run: cd apps/dashboard && npm install"))
    })
  })

program.parse()

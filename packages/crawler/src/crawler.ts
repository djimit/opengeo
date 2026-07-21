import * as cheerio from "cheerio"
import type {
  NormalizedPageModel,
  Link,
  Heading,
  MetaTag,
  JsonLd,
  HttpHeader,
} from "@opengeo/shared"
import { RateLimiter, type RateLimitConfig } from "./rate-limiter.js"
import { fetchAndParseSitemaps, type SitemapEntry } from "./sitemap.js"

export interface CrawlOptions {
  max_pages: number
  depth: number
  concurrency: number
  timeout_ms: number
  user_agent: string
  follow_redirects: boolean
  respect_robots_txt: boolean
  render_javascript: boolean
  rate_limit?: RateLimitConfig
  sitemap_discover: boolean
  exclude_patterns: string[]
}

export interface CrawlResult {
  pages: NormalizedPageModel[]
  robots_txt: string | null
  sitemaps: string[]
  sitemap_entries?: SitemapEntry[]
  errors: Array<{ url: string; error: string }>
  duration_ms: number
  rate_limit_stats?: { avg_delay_ms: number; total_requests: number }
  crawl_blocked?: boolean
}

const DEFAULT_OPTIONS: CrawlOptions = {
  max_pages: 100,
  depth: 3,
  concurrency: 3,
  timeout_ms: 30_000,
  user_agent: "OpenGeoBot/0.1.0 (+https://github.com/DjimIT/opengeo)",
  follow_redirects: true,
  respect_robots_txt: true,
  render_javascript: false,
  sitemap_discover: true,
  exclude_patterns: ["/admin", "/login", "/cart", "/checkout", "/api/"],
}

export async function crawlSite(
  startUrl: string,
  options: Partial<CrawlOptions> = {},
): Promise<CrawlResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const start = Date.now()
  const pages: NormalizedPageModel[] = []
  const errors: Array<{ url: string; error: string }> = []
  const visited = new Set<string>()
  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }]
  const sitemaps: string[] = []
  let sitemapEntries: SitemapEntry[] = []
  let robotsTxt: string | null = null

  const rateLimiter = new RateLimiter(opts.rate_limit ?? {})
  let totalRequests = 0

  const baseUrl = new URL(startUrl)
  const robotsUrl = `${baseUrl.origin}/robots.txt`

  // Fetch robots.txt
  try {
    await rateLimiter.wait()
    const robotsRes = await fetch(robotsUrl, {
      headers: { "User-Agent": opts.user_agent },
      signal: AbortSignal.timeout(opts.timeout_ms),
    })
    totalRequests++
    if (robotsRes.ok) {
      robotsTxt = await robotsRes.text()
      sitemaps.push(...extractSitemaps(robotsTxt))

      // Extract Crawl-delay from robots.txt
      const crawlDelayMatch = robotsTxt.match(/crawl-delay:\s*(\d+)/i)
      if (crawlDelayMatch) {
        rateLimiter.setCrawlDelay(parseInt(crawlDelayMatch[1]!, 10))
      }
      rateLimiter.reportSuccess()
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push({ url: robotsUrl, error: "Failed to fetch robots.txt: " + msg.slice(0, 100) })
    // Don't penalize rate limiter for server protocol issues — continue crawling
    // Try default sitemap location
    if (opts.sitemap_discover) {
      sitemaps.push(`${baseUrl.origin}/sitemap.xml`)
    }
  }

  // Discover sitemaps
  if (opts.sitemap_discover) {
    const sitemapResult = await fetchAndParseSitemaps(robotsTxt, baseUrl.origin)
    sitemapEntries = sitemapResult.urls
    sitemaps.push(...sitemapResult.sitemapIndexUrls)

    // Add sitemap URLs to queue if not already visited
    for (const entry of sitemapResult.urls) {
      if (!visited.has(normalizeUrl(entry.url))) {
        queue.push({ url: entry.url, depth: 0 })
      }
    }
  }

  // If no pages were added by sitemap, ensure startUrl is in queue
  if (queue.length === 0 && !visited.has(normalizeUrl(startUrl))) {
    queue.push({ url: startUrl, depth: 0 })
  }

  // Main crawl loop
  while (queue.length > 0 && pages.length < opts.max_pages) {
    const batch = queue.splice(0, Math.min(opts.concurrency, opts.max_pages - pages.length))

    const results = await Promise.allSettled(
      batch.map(async ({ url, depth }) => {
        await rateLimiter.wait()
        totalRequests++
        return crawlPage(url, depth, opts, visited, queue, baseUrl.origin, errors)
      }),
    )

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.page) pages.push(result.value.page)
        rateLimiter.reportSuccess()
      } else {
        errors.push({ url: "batch", error: String(result.reason) })
        rateLimiter.reportError()
      }
    }
  }

  const stats = rateLimiter.getStats()

  return {
    pages,
    robots_txt: robotsTxt,
    sitemaps,
    sitemap_entries: sitemapEntries,
    errors,
     duration_ms: Date.now() - start,
    rate_limit_stats: {
      avg_delay_ms: stats.currentDelay,
      total_requests: totalRequests,
    },
    crawl_blocked: pages.length === 0 && errors.length > 0,
  }
}

interface CrawlPageResult {
  page: NormalizedPageModel | null
}

async function crawlPage(
  url: string,
  depth: number,
  opts: CrawlOptions,
  visited: Set<string>,
  queue: Array<{ url: string; depth: number }>,
  origin: string,
  errors: Array<{ url: string; error: string }>,
): Promise<CrawlPageResult> {
  const normalizedUrl = normalizeUrl(url)
  if (visited.has(normalizedUrl)) return { page: null }
  if (depth > opts.depth) return { page: null }

  // Skip excluded patterns
  if (opts.exclude_patterns.some((pattern) => normalizedUrl.includes(pattern))) {
    return { page: null }
  }

  visited.add(normalizedUrl)

  let html: string
  let statusCode = 0
  let responseHeaders = new Headers()
  let finalUrl = normalizedUrl

  try {
    const res = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": opts.user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: opts.follow_redirects ? "follow" : "manual",
      signal: AbortSignal.timeout(opts.timeout_ms),
    })
    html = await res.text()
    finalUrl = res.url || normalizedUrl
    statusCode = res.status
    responseHeaders = res.headers
  } catch {
    // Fallback: use curl if native fetch fails (handles malformed HTTP headers)
    try {
      const { execFileSync } = await import("node:child_process")
      const output = execFileSync("curl", [
        "-sL", "-o", "-",
        "-A", opts.user_agent,
        "--compressed",
        "--max-time", String(Math.floor(opts.timeout_ms / 1000)),
        normalizedUrl,
      ], { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 })
      html = output
      statusCode = 200
    } catch {
      // Both fetch and curl failed — cannot crawl
      return { page: null }
    }
  }

  try {
    const page = parseHtml(html, normalizedUrl, finalUrl, responseHeaders, statusCode)

    if (depth < opts.depth) {
      for (const link of page.links) {
        if (link.is_internal && !visited.has(normalizeUrl(link.href))) {
          queue.push({ url: link.href, depth: depth + 1 })
        }
      }
    }

    return { page }
  } catch (err) {
    // Log the error but don't crash — return null page
    const msg = err instanceof Error ? err.message : String(err)
    errors.push({ url: normalizedUrl, error: msg.slice(0, 100) })
    return { page: null }
  }
}

function parseHtml(
  html: string,
  url: string,
  finalUrl: string,
  headers: Headers,
  statusCode: number,
): NormalizedPageModel {
  const $ = cheerio.load(html)
  const title = $("title").text().trim()
  const metaDescription = $('meta[name="description"]').attr("content")
  const canonical = $('link[rel="canonical"]').attr("href")
  const robotsDirective = $('meta[name="robots"]').attr("content")
  const noindex = robotsDirective?.toLowerCase().includes("noindex") ?? false
  const nofollow = robotsDirective?.toLowerCase().includes("nofollow") ?? false

  const meta_tags: MetaTag[] = []
  $("meta").each((_, el) => {
    const name = $(el).attr("name") ?? $(el).attr("property") ?? ""
    const content = $(el).attr("content") ?? ""
    if (name && content) meta_tags.push({ name, content })
  })

  const headings: Heading[] = []
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.tagName[1] ?? "1", 10)
    const text = $(el).text().trim()
    if (text) headings.push({ level, text })
  })

  const links: Link[] = []
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")
    if (!href) return
    const isInternal = href.startsWith("/") || href.startsWith(url) || href.startsWith(finalUrl)
    const nofollow = $(el).attr("rel")?.includes("nofollow") ?? false
    const text = $(el).text().trim()
    links.push({ href, is_internal: isInternal, nofollow, text: text || undefined })
  })

  const jsonld: JsonLd[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() ?? ""
    if (!raw.trim()) return
    try {
      const parsed = JSON.parse(raw)
      const type = parsed["@type"] ?? parsed.type
      jsonld.push({ type, raw, parsed })
    } catch {
      jsonld.push({ raw })
    }
  })

  // Hreflang detection
  const hreflang: Array<{ lang: string; url: string }> = []
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang") ?? ""
    const hrefUrl = $(el).attr("href") ?? ""
    if (lang && hrefUrl) hreflang.push({ lang, url: hrefUrl })
  })

  const http_headers: HttpHeader[] = []
  headers.forEach((value, name) => {
    http_headers.push({ name, value })
  })

  // Remove script and style tags before extracting text (prevents JSON-LD from polluting content)
  $("script, style, noscript").remove()
  const text_content = $("body").text().replace(/\s+/g, " ").trim()
  const word_count = text_content.split(/\s+/).filter(Boolean).length

  return {
    url,
    final_url: finalUrl,
    status_code: statusCode,
    content_type: headers.get("content-type") ?? "",
    title,
    meta_description: metaDescription ?? undefined,
    canonical: canonical ?? undefined,
    robots_directives: robotsDirective ? robotsDirective.split(",").map((d) => d.trim()) : [],
    noindex,
    nofollow,
    headers: http_headers,
    meta_tags,
    headings,
    links,
    jsonld,
    hreflang: hreflang.length > 0 ? hreflang : undefined,
    html_length: html.length,
    text_content,
    word_count,
    crawled_at: new Date().toISOString(),
    render_method: "static",
    has_time_element: $("time[datetime]").length > 0,
    has_date_in_meta: meta_tags.some((m) => m.name.includes("date") || m.name.includes("modified") || m.name.includes("published")),
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ""
    return u.toString()
  } catch {
    return url
  }
}

function extractSitemaps(robotsTxt: string): string[] {
  const sitemaps: string[] = []
  for (const line of robotsTxt.split("\n")) {
    const trimmed = line.trim().toLowerCase()
    if (trimmed.startsWith("sitemap:")) {
      const url = line.trim().slice(8).trim()
      if (url) sitemaps.push(url)
    }
  }
  return sitemaps
}

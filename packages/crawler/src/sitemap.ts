export interface SitemapEntry {
  url: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

export interface SitemapParseResult {
  urls: SitemapEntry[]
  sitemapIndexUrls: string[]
  isIndex: boolean
}

export async function fetchAndParseSitemaps(
  robotsTxt: string | null,
  origin: string,
): Promise<SitemapParseResult> {
  const urls: SitemapEntry[] = []
  const sitemapIndexUrls: string[] = []

  // Extract sitemap URLs from robots.txt
  if (robotsTxt) {
    for (const line of robotsTxt.split("\n")) {
      const trimmed = line.trim().toLowerCase()
      if (trimmed.startsWith("sitemap:")) {
        const url = line.trim().slice(8).trim()
        if (url) sitemapIndexUrls.push(url)
      }
    }
  }

  // Try default sitemap location if none found
  if (sitemapIndexUrls.length === 0) {
    sitemapIndexUrls.push(`${origin}/sitemap.xml`)
  }

  // Fetch and parse each sitemap
  for (const sitemapUrl of sitemapIndexUrls) {
    try {
      const res = await fetch(sitemapUrl, {
        headers: { "User-Agent": "OpenGeoBot/0.1.0" },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) continue

      const xml = await res.text()
      const parsed = parseSitemapXml(xml)

      if (parsed.isIndex) {
        // It's a sitemap index — add nested sitemaps to fetch list
        for (const entry of parsed.urls) {
          sitemapIndexUrls.push(entry.url)
        }
      } else {
        urls.push(...parsed.urls)
      }
    } catch {
      // Sitemap fetch failed — non-fatal
    }
  }

  return { urls, sitemapIndexUrls, isIndex: false }
}

export function parseSitemapXml(xml: string): SitemapParseResult {
  const urls: SitemapEntry[] = []
  let isIndex = false

  // Check if it's a sitemap index
  if (xml.includes("<sitemapindex") || xml.includes("<sitemapIndex>")) {
    isIndex = true
    const sitemapRegex = /<sitemap>([\s\S]*?)<\/sitemap>/gi
    let match
    while ((match = sitemapRegex.exec(xml)) !== null) {
      const block = match[1]!
      const loc = extractXmlValue(block, "loc")
      if (loc) {
        urls.push({
          url: loc,
          lastmod: extractXmlValue(block, "lastmod"),
        })
      }
    }
    return { urls, sitemapIndexUrls: [], isIndex: true }
  }

  // Regular URL set
  const urlRegex = /<url>([\s\S]*?)<\/url>/gi
  let match
  while ((match = urlRegex.exec(xml)) !== null) {
    const block = match[1]!
    const loc = extractXmlValue(block, "loc")
    if (!loc) continue

    const priority = extractXmlValue(block, "priority")
    urls.push({
      url: loc,
      lastmod: extractXmlValue(block, "lastmod"),
      changefreq: extractXmlValue(block, "changefreq"),
      priority: priority ? parseFloat(priority) : undefined,
    })
  }

  return { urls, sitemapIndexUrls: [], isIndex: false }
}

function extractXmlValue(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i")
  const match = regex.exec(xml)
  return match?.[1]?.trim()
}

export function filterSitemapUrls(
  entries: SitemapEntry[],
  options: {
    excludePatterns?: string[]
    maxUrls?: number
    minPriority?: number
  } = {},
): SitemapEntry[] {
  let filtered = entries

  if (options.excludePatterns) {
    filtered = filtered.filter((entry) =>
      !options.excludePatterns!.some((pattern) =>
        entry.url.includes(pattern),
      ),
    )
  }

  if (options.minPriority !== undefined) {
    filtered = filtered.filter(
      (entry) => (entry.priority ?? 0.5) >= options.minPriority!,
    )
  }

  // Sort by priority (descending), then by lastmod (most recent first)
  filtered.sort((a, b) => {
    const prioDiff = (b.priority ?? 0.5) - (a.priority ?? 0.5)
    if (prioDiff !== 0) return prioDiff
    if (a.lastmod && b.lastmod) return b.lastmod.localeCompare(a.lastmod)
    return 0
  })

  if (options.maxUrls) {
    filtered = filtered.slice(0, options.maxUrls)
  }

  return filtered
}

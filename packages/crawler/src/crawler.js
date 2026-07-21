import * as cheerio from "cheerio";
const DEFAULT_OPTIONS = {
    max_pages: 100,
    depth: 3,
    concurrency: 5,
    timeout_ms: 30_000,
    user_agent: "OpenGeoBot/0.1.0 (+https://github.com/DjimIT/opengeo)",
    follow_redirects: true,
    respect_robots_txt: true,
};
export async function crawlSite(startUrl, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const start = Date.now();
    const pages = [];
    const errors = [];
    const visited = new Set();
    const queue = [{ url: startUrl, depth: 0 }];
    const sitemaps = [];
    let robotsTxt = null;
    const baseUrl = new URL(startUrl);
    const robotsUrl = `${baseUrl.origin}/robots.txt`;
    try {
        const robotsRes = await fetch(robotsUrl, {
            headers: { "User-Agent": opts.user_agent },
            signal: AbortSignal.timeout(opts.timeout_ms),
        });
        if (robotsRes.ok) {
            robotsTxt = await robotsRes.text();
            sitemaps.push(...extractSitemaps(robotsTxt));
        }
    }
    catch {
        errors.push({ url: robotsUrl, error: "Failed to fetch robots.txt" });
    }
    while (queue.length > 0 && pages.length < opts.max_pages) {
        const batch = queue.splice(0, opts.concurrency);
        const results = await Promise.allSettled(batch.map(({ url, depth }) => crawlPage(url, depth, opts, visited, queue, baseUrl.origin)));
        for (const result of results) {
            if (result.status === "fulfilled") {
                if (result.value.page)
                    pages.push(result.value.page);
            }
            else {
                errors.push({ url: "batch", error: String(result.reason) });
            }
        }
    }
    return {
        pages,
        robots_txt: robotsTxt,
        sitemaps,
        errors,
        duration_ms: Date.now() - start,
    };
}
async function crawlPage(url, depth, opts, visited, queue, origin) {
    const normalizedUrl = normalizeUrl(url);
    if (visited.has(normalizedUrl))
        return { page: null };
    if (depth > opts.depth)
        return { page: null };
    visited.add(normalizedUrl);
    try {
        const res = await fetch(normalizedUrl, {
            headers: { "User-Agent": opts.user_agent },
            redirect: opts.follow_redirects ? "follow" : "manual",
            signal: AbortSignal.timeout(opts.timeout_ms),
        });
        const html = await res.text();
        const finalUrl = res.url || normalizedUrl;
        const ct = res.headers.get("content-type") ?? "";
        const page = parseHtml(html, normalizedUrl, finalUrl, res.headers, res.status, ct);
        if (depth < opts.depth) {
            for (const link of page.links) {
                if (link.is_internal && !visited.has(normalizeUrl(link.href))) {
                    queue.push({ url: link.href, depth: depth + 1 });
                }
            }
        }
        return { page };
    }
    catch (err) {
        return { page: null };
    }
}
function parseHtml(html, url, finalUrl, headers, statusCode, contentType) {
    const $ = cheerio.load(html);
    const title = $("title").text().trim();
    const metaDescription = $('meta[name="description"]').attr("content");
    const canonical = $('link[rel="canonical"]').attr("href");
    const robotsDirective = $('meta[name="robots"]').attr("content");
    const noindex = robotsDirective?.toLowerCase().includes("noindex") ?? false;
    const nofollow = robotsDirective?.toLowerCase().includes("nofollow") ?? false;
    const meta_tags = [];
    $("meta").each((_, el) => {
        const name = $(el).attr("name") ?? $(el).attr("property") ?? "";
        const content = $(el).attr("content") ?? "";
        if (name && content)
            meta_tags.push({ name, content });
    });
    const headings = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        const level = parseInt(el.tagName[1] ?? "1", 10);
        const text = $(el).text().trim();
        if (text)
            headings.push({ level, text });
    });
    const links = [];
    $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href)
            return;
        const isInternal = href.startsWith("/") || href.startsWith(url);
        const nofollow = $(el).attr("rel")?.includes("nofollow") ?? false;
        const text = $(el).text().trim();
        links.push({ href, is_internal: isInternal, nofollow, text: text || undefined });
    });
    const jsonld = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).html() ?? "";
        if (!raw.trim())
            return;
        try {
            const parsed = JSON.parse(raw);
            const type = parsed["@type"] ?? parsed.type;
            jsonld.push({ type, raw, parsed });
        }
        catch {
            jsonld.push({ raw });
        }
    });
    const http_headers = [];
    headers.forEach((value, name) => {
        http_headers.push({ name, value });
    });
    const text_content = $("body").text().replace(/\s+/g, " ").trim();
    const word_count = text_content.split(/\s+/).filter(Boolean).length;
    return {
        url,
        final_url: finalUrl,
        status_code: statusCode,
        content_type: contentType,
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
        html_length: html.length,
        text_content,
        word_count,
        crawled_at: new Date().toISOString(),
        render_method: "static",
    };
}
function normalizeUrl(url) {
    try {
        const u = new URL(url);
        u.hash = "";
        return u.toString();
    }
    catch {
        return url;
    }
}
function extractSitemaps(robotsTxt) {
    const sitemaps = [];
    for (const line of robotsTxt.split("\n")) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith("sitemap:")) {
            const url = line.trim().slice(8).trim();
            if (url)
                sitemaps.push(url);
        }
    }
    return sitemaps;
}
//# sourceMappingURL=crawler.js.map
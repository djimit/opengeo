import { test } from "node:test"
import assert from "node:assert/strict"
import { parseSitemapXml, filterSitemapUrls } from "../sitemap.js"

test("parseSitemapXml: parses valid URL set", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.org/page1</loc>
    <lastmod>2026-01-15</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.org/page2</loc>
    <changefreq>weekly</changefreq>
  </url>
</urlset>`

  const result = parseSitemapXml(xml)
  assert.equal(result.isIndex, false)
  assert.equal(result.urls.length, 2)
  assert.equal(result.urls[0]!.url, "https://example.org/page1")
  assert.equal(result.urls[0]!.lastmod, "2026-01-15")
  assert.equal(result.urls[0]!.priority, 0.8)
  assert.equal(result.urls[1]!.url, "https://example.org/page2")
  assert.equal(result.urls[1]!.changefreq, "weekly")
})

test("parseSitemapXml: parses sitemap index", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.org/sitemap1.xml</loc>
    <lastmod>2026-01-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.org/sitemap2.xml</loc>
  </sitemap>
</sitemapindex>`

  const result = parseSitemapXml(xml)
  assert.equal(result.isIndex, true)
  assert.equal(result.urls.length, 2)
  assert.equal(result.urls[0]!.url, "https://example.org/sitemap1.xml")
})

test("parseSitemapXml: handles empty sitemap", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`

  const result = parseSitemapXml(xml)
  assert.equal(result.urls.length, 0)
  assert.equal(result.isIndex, false)
})

test("parseSitemapXml: handles invalid XML gracefully", () => {
  const xml = "not valid xml"
  const result = parseSitemapXml(xml)
  assert.equal(result.urls.length, 0)
})

test("filterSitemapUrls: excludes patterns", () => {
  const entries = [
    { url: "https://example.org/page1" },
    { url: "https://example.org/admin/page" },
    { url: "https://example.org/login" },
  ]

  const filtered = filterSitemapUrls(entries, { excludePatterns: ["/admin", "/login"] })
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0]!.url, "https://example.org/page1")
})

test("filterSitemapUrls: sorts by priority", () => {
  const entries = [
    { url: "https://example.org/low", priority: 0.3 },
    { url: "https://example.org/high", priority: 0.9 },
    { url: "https://example.org/medium", priority: 0.5 },
  ]

  const filtered = filterSitemapUrls(entries)
  assert.equal(filtered[0]!.url, "https://example.org/high")
  assert.equal(filtered[1]!.url, "https://example.org/medium")
  assert.equal(filtered[2]!.url, "https://example.org/low")
})

test("filterSitemapUrls: respects maxUrls", () => {
  const entries = Array.from({ length: 10 }, (_, i) => ({
    url: `https://example.org/page${i}`,
    priority: 1 - i * 0.1,
  }))

  const filtered = filterSitemapUrls(entries, { maxUrls: 3 })
  assert.equal(filtered.length, 3)
})

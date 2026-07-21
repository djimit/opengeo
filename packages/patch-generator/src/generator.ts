import type { Finding, NormalizedPageModel } from "@opengeo/shared"

export interface PatchResult {
  rule_id: string
  target_url: string
  patch: string
  target_file: string
  confidence: "high" | "medium" | "low"
}

const PATCHERS: Record<string, (finding: Finding, page: NormalizedPageModel) => PatchResult | null> = {
  "GEO-CRAWL-003": patchCanonicalMissing,
  "GEO-DATA-001": patchJsonLdMissing,
  "GEO-DATA-002": patchOrganizationMissing,
  "GEO-ENTITY-001": patchTitleMissing,
  "GEO-ENTITY-002": patchMetaDescriptionMissing,
  "GEO-ENTITY-003": patchH1Missing,
  "GEO-SEC-001": patchSecurityHeaders,
}

export function generatePatchForFinding(
  finding: Finding,
  page: NormalizedPageModel,
): PatchResult | null {
  const patcher = PATCHERS[finding.id]
  if (!patcher) return null
  return patcher(finding, page)
}

export function generateAllPatches(
  findings: Finding[],
  pages: NormalizedPageModel[],
): PatchResult[] {
  const results: PatchResult[] = []
  const pageMap = new Map(pages.map((p) => [p.url, p]))

  for (const finding of findings) {
    const page = pageMap.get(finding.evidence.url)
    if (!page) continue
    const patch = generatePatchForFinding(finding, page)
    if (patch) results.push(patch)
  }

  return results
}

function patchCanonicalMissing(finding: Finding, page: NormalizedPageModel): PatchResult {
  return {
    rule_id: finding.id,
    target_url: page.url,
    target_file: "index.html",
    confidence: "high",
    patch: `--- a/index.html\n+++ b/index.html\n@@ -1,5 +1,6 @@\n <head>\n+  <link rel="canonical" href="${page.url}" />\n   <title>${page.title}</title>`,
  }
}

function patchJsonLdMissing(finding: Finding, page: NormalizedPageModel): PatchResult {
  return {
    rule_id: finding.id,
    target_url: page.url,
    target_file: "index.html",
    confidence: "medium",
    patch: `--- a/index.html\n+++ b/index.html\n@@ -1,5 +1,12 @@\n <head>\n+  <script type="application/ld+json">\n+  {\n+    "@context": "https://schema.org",\n+    "@type": "WebPage",\n+    "name": "${page.title}"\n+  }\n+  </script>`,
  }
}

function patchOrganizationMissing(_finding: Finding, page: NormalizedPageModel): PatchResult {
  const orgName = page.title || "Organization Name"
  return {
    rule_id: "GEO-DATA-002",
    target_url: page.url,
    target_file: "index.html",
    confidence: "medium",
    patch: `--- a/index.html\n+++ b/index.html\n@@ -1,5 +1,14 @@\n <head>\n+  <script type="application/ld+json">\n+  {\n+    "@context": "https://schema.org",\n+    "@type": "Organization",\n+    "name": "${orgName}",\n+    "url": "${page.url}",\n+    "sameAs": []\n+  }\n+  </script>`,
  }
}

function patchTitleMissing(_finding: Finding, page: NormalizedPageModel): PatchResult {
  return {
    rule_id: "GEO-ENTITY-001",
    target_url: page.url,
    target_file: "index.html",
    confidence: "high",
    patch: `--- a/index.html\n+++ b/index.html\n@@ -1,5 +1,6 @@\n <head>\n+  <title>Page Title — ${new URL(page.url).hostname}</title>`,
  }
}

function patchMetaDescriptionMissing(finding: Finding, page: NormalizedPageModel): PatchResult {
  // Extract real text content: skip JSON-LD scripts, take first meaningful paragraph
  const rawText = page.text_content || ""
  // Remove JSON-LD blocks (everything between { and } that contains @context or @type)
  const noJsonLd = rawText.replace(/\{[^{}]*@context[^{}]*\}/gs, "")
    .replace(/\{[^{}]*@type[^{}]*\}/gs, "")
    .replace(/\[\{[^\]]*@context[^\]]*\]/g, "")
  // Get first meaningful text (at least 20 chars, not just whitespace/nav)
  const sentences = noJsonLd
    .replace(/\s+/g, " ")
    .trim()
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20 && !s.startsWith("http"))
  const snippet = sentences[0] || "Pagina overzicht en informatie."
  const truncated = snippet.slice(0, 150).trim()
  const escaped = truncated.replace(/"/g, "&quot;")
  return {
    rule_id: finding.id,
    target_url: page.url,
    target_file: "index.html",
    confidence: "medium",
    patch: `--- a/index.html\n+++ b/index.html\n@@ -1,5 +1,6 @@\n <head>\n+  <meta name="description" content="${escaped}" />`,
  }
}

function patchH1Missing(_finding: Finding, page: NormalizedPageModel): PatchResult {
  const h1Text = page.title || "Page Heading"
  return {
    rule_id: "GEO-ENTITY-003",
    target_url: page.url,
    target_file: "index.html",
    confidence: "high",
    patch: `--- a/index.html\n+++ b/index.html\n@@ -8,6 +8,7 @@\n <body>\n+  <h1>${h1Text}</h1>`,
  }
}

function patchSecurityHeaders(_finding: Finding, page: NormalizedPageModel): PatchResult {
  return {
    rule_id: "GEO-SEC-001",
    target_url: page.url,
    target_file: "server.conf",
    confidence: "medium",
    patch: `--- a/server.conf\n+++ b/server.conf\n@@ -1,3 +1,5 @@\n server {\n+  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n+  add_header X-Content-Type-Options "nosniff" always;\n }`,
  }
}

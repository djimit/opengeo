import type { RuleEngine } from "@opengeo/rule-engine"
import type { Finding, NormalizedPageModel } from "@opengeo/shared"

function hasJsonLdType(jsonLd: Array<{ type?: string | string[] }>, targetType: string | string[]): boolean {
  const targets = Array.isArray(targetType) ? targetType : [targetType]
  return jsonLd.some((j) => {
    if (!j.type) return false
    const types = Array.isArray(j.type) ? j.type : [j.type]
    return types.some((t) => targets.includes(t))
  })
}

function isHomepage(ctx: { page: NormalizedPageModel; allPages: NormalizedPageModel[] }): boolean {
  return ctx.page.url === ctx.allPages[0]?.url
}

/** Calculate Flesch-Kincaid readability score (simplified for Dutch/English) */
function calculateReadability(text: string): { score: number; grade: string } {
  // Split on sentence-ending punctuation followed by space or end of string
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 5)
  const words = text.split(/\s+/).filter((w) => w.length > 1)
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0)

  if (sentences.length < 2 || words.length < 10) return { score: 50, grade: "moderate" }

  // Flesch Reading Ease (simplified, works for both EN and NL approximately)
  const avgSentenceLength = words.length / sentences.length
  const avgSyllablesPerWord = syllables / words.length
  const score = Math.max(0, Math.min(100, 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord))

  let grade: string
  if (score >= 80) grade = "very easy"
  else if (score >= 60) grade = "easy"
  else if (score >= 40) grade = "moderate"
  else if (score >= 20) grade = "difficult"
  else grade = "very difficult"

  return { score: Math.round(score), grade }
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "")
  if (word.length <= 3) return 1
  let count = 0
  const vowels = "aeiouy"
  let prevVowel = false
  for (const char of word) {
    const isVowel = vowels.includes(char)
    if (isVowel && !prevVowel) count++
    prevVowel = isVowel
  }
  if (word.endsWith("e") && count > 1) count--
  return Math.max(1, count)
}

export function registerContentQualityRules(engine: RuleEngine): void {

  // =====================================================================
  // READABILITY & CONTENT KWALITEIT
  // =====================================================================

  // GEO-CONTENT-006: Content readability too difficult
  engine.register({
    id: "GEO-CONTENT-006", category: "content", title: "Content readability may be too difficult",
    description: "AI systems prefer content that is easy to parse and understand", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 200) return findings
      // Skip readability check if text looks like JS-rendered (words glued together)
      const text = ctx.page.text_content
      const words = text.split(/\s+/).filter((w) => w.length > 0)
      const longWords = words.filter((w) => w.length > 15).length
      const longWordRatio = longWords / words.length
      if (longWordRatio > 0.05) return findings // >5% very long words = glued text, skip
      const { score, grade } = calculateReadability(text)
      if (score < 20) {
        findings.push({
          id: "GEO-CONTENT-006", title: `Content readability: ${grade} (score: ${score}/100)`,
          category: "content", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `Flesch Reading Ease: ${score}/100 (${grade}). Note: score may be inaccurate for JS-rendered content. Aim for 50+ for AI readability.` },
          impact: { search: "low", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI systems prefer content that is easy to parse. Complex sentences and long words reduce AI comprehension and citation likelihood. Break long sentences, use simpler words, and add structure.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CONTENT-007: Keyword stuffing detection
  engine.register({
    id: "GEO-CONTENT-007", category: "content", title: "Potential keyword stuffing detected",
    description: "Excessive keyword repetition signals low quality to AI systems", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 100) return findings
      const words = ctx.page.text_content.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
      const freq: Record<string, number> = {}
      for (const w of words) freq[w] = (freq[w] || 0) + 1
      // Only flag words appearing >8 times with >5% density (real stuffing)
      const suspicious = Object.entries(freq)
        .filter(([, count]) => count > 8 && count / words.length > 0.05)
        .map(([word]) => word)
      if (suspicious.length > 0) {
        findings.push({
          id: "GEO-CONTENT-007", title: `Potential keyword stuffing: "${suspicious.slice(0, 3).join('", "')}"`,
          category: "content", severity: "medium", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `Words appearing >5 times with >3% density: ${suspicious.slice(0, 5).join(", ")}` },
          impact: { search: "medium", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "Keyword stuffing is penalized by both Google and AI systems. AI models detect unnatural repetition and downrank content. Use synonyms and natural language instead.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation", url: "https://developers.google.com/search/docs/essentials/spam-policies#keyword-stuffing" }],
          rule_metadata: { status: "verified", evidence_level: "official-documentation", last_reviewed: "2026-07-21", applicable_to: ["google-search", "ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CONTENT-008: Low information density
  engine.register({
    id: "GEO-CONTENT-008", category: "content", title: "Low information density — too much filler",
    description: "AI systems prefer content with high fact-to-filler ratio", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 200) return findings
      const text = ctx.page.text_content.toLowerCase()
      // Count filler words (very rough heuristic)
      const fillerWords = ["eigenlijk", "gewoon", "simpelweg", "letten", "wel", "nogal", "beetje", "zoals", "eigenlijk", "just", "really", "very", "quite", "basically", "actually", "simply"]
      const words = text.split(/\s+/)
      const fillerCount = words.filter((w) => fillerWords.includes(w)).length
      const fillerRatio = fillerCount / words.length
      if (fillerRatio > 0.05) {
        findings.push({
          id: "GEO-CONTENT-008", title: `High filler word ratio: ${Math.round(fillerRatio * 100)}%`,
          category: "content", severity: "low", confidence: "low",
          evidence: { url: ctx.page.url, snippet: `${fillerCount} filler words out of ${words.length} total (${Math.round(fillerRatio * 100)}%). Aim for <5%.` },
          impact: { search: "none", ai_retrieval: "medium", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI systems extract facts and claims. Content with high filler-to-information ratio is less likely to be cited. Remove filler words and add concrete data, examples, and facts.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // CONTENT STRUCTUUR VOOR AI CITAAT
  // =====================================================================

  // GEO-CITE-004: Missing passage-friendly structure
  engine.register({
    id: "GEO-CITE-004", category: "citations", title: "Content not optimized for passage citation",
    description: "AI systems cite specific passages — clear paragraph structure helps", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 300) return findings
      const text = ctx.page.text_content
      // Check for very long paragraphs (AI prefers concise, self-contained paragraphs)
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
      const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 80)
      if (longParagraphs.length > paragraphs.length * 0.5 && paragraphs.length > 2) {
        findings.push({
          id: "GEO-CITE-004", title: `${longParagraphs.length} paragraphs are very long (>80 words)`,
          category: "citations", severity: "low", confidence: "medium",
          evidence: { url: ctx.page.url, snippet: `${Math.round(longParagraphs.length / paragraphs.length * 100)}% of paragraphs exceed 80 words. AI prefers 3-5 sentence paragraphs.` },
          impact: { search: "none", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI systems cite specific passages, not entire pages. Long paragraphs make it harder for AI to extract precise answers. Break long paragraphs into 3-5 sentence chunks, each covering one idea.",
            effort: "medium",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/citations-working-group" },
        })
      }
      return findings
    },
  })

  // GEO-CITE-005: Low fact/claim density
  engine.register({
    id: "GEO-CITE-005", category: "citations", title: "Low fact density — few citable claims",
    description: "AI systems cite content with specific facts, numbers, and claims", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 200) return findings
      const text = ctx.page.text_content
      // Count facts: numbers, percentages, dates, statistics
      const numbers = (text.match(/\d+%?/g) || []).length
      const dates = (text.match(/\b(20\d{2}|19\d{2})\b/g) || []).length
      const factDensity = (numbers + dates) / (ctx.page.word_count / 100)
      if (factDensity < 0.5 && ctx.page.word_count > 300) {
        findings.push({
          id: "GEO-CITE-005", title: `Low fact density: ${factDensity.toFixed(1)} facts per 100 words`,
          category: "citations", severity: "medium", confidence: "low",
          evidence: { url: ctx.page.url, snippet: `${numbers} numbers, ${dates} years in ${ctx.page.word_count} words. Aim for 2+ facts per 100 words.` },
          impact: { search: "none", ai_retrieval: "high", model_training: "none", user_experience: "none" },
          recommendation: {
            action: "review",
            rationale: "AI systems prefer to cite content with specific facts, statistics, and data. Content with few numbers or claims is less likely to be referenced. Add specific data points, percentages, dates, and research findings.",
            effort: "large",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/citations-working-group" },
        })
      }
      return findings
    },
  })

  // =====================================================================
  // CALL-TO-ACTION & CONVERSIE
  // =====================================================================

  // GEO-CONTENT-009: Missing call-to-action
  engine.register({
    id: "GEO-CONTENT-009", category: "content", title: "No clear call-to-action detected",
    description: "CTAs signal page purpose to AI systems and improve user engagement", enabled: true,
    evaluate(ctx) {
      const findings: Finding[] = []
      if (ctx.page.word_count < 200) return findings
      const text = ctx.page.text_content.toLowerCase()
      const ctaPatterns = /\b(neem contact|contact|bel|mail|download|inschrijven|registreren|bestel|koop|gratis|offerte|demo|afspraak|plan|start|probeer|ontdek|lees meer|meer info)\b/i
      const hasLinks = ctx.page.links.length > 0
      if (!ctaPatterns.test(text) && !hasLinks) {
        findings.push({
          id: "GEO-CONTENT-009", title: "No call-to-action or interactive elements found",
          category: "content", severity: "low", confidence: "low",
          evidence: { url: ctx.page.url, snippet: "No CTA text patterns and no links detected on page" },
          impact: { search: "none", ai_retrieval: "low", model_training: "none", user_experience: "medium" },
          recommendation: {
            action: "review",
            rationale: "AI systems assess page purpose. A clear CTA (contact, download, sign up) signals that the page serves a specific user intent. Pages without CTAs are harder for AI to classify and recommend.",
            effort: "small",
          },
          sources: [{ vendor: "Google", type: "official-documentation" }],
          rule_metadata: { status: "experimental", evidence_level: "community-consensus", last_reviewed: "2026-07-21", applicable_to: ["ai-search"], maintainer: "@opengeo/content-working-group" },
        })
      }
      return findings
    },
  })
}

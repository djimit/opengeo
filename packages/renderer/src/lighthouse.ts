import { chromium } from "playwright"
import type { NormalizedPageModel } from "@opengeo/shared"

export interface LighthouseResult {
  performance: number
  accessibility: number
  seo: number
  best_practices: number
  core_web_vitals: {
    lcp?: number
    inp?: number
    cls?: number
    ttfb?: number
    fcp?: number
  }
}

export interface LighthouseThresholds {
  performance: number
  accessibility: number
  seo: number
  lcp: number
  inp: number
  cls: number
}

const DEFAULT_THRESHOLDS: LighthouseThresholds = {
  performance: 0.5,
  accessibility: 0.5,
  seo: 0.5,
  lcp: 2500,
  inp: 200,
  cls: 0.1,
}

export async function runLighthouse(
  url: string,
  options: { timeout_ms?: number; thresholds?: Partial<LighthouseThresholds> } = {},
): Promise<LighthouseResult | null> {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds }

  try {
    // Use Playwright to collect performance metrics via CDP
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    // Enable CDP session for performance metrics
    const cdp = await context.newCDPSession(page)

    // Navigate
    await page.goto(url, { waitUntil: "networkidle", timeout: options.timeout_ms ?? 30_000 })

    // Collect Core Web Vitals via Performance Observer
    // Cast to any because these entry types exist in browsers but not in Node.js types
    const metrics = await page.evaluate(() => {
      return new Promise<Record<string, number>>((resolve) => {
        const result: Record<string, number> = {}
        let entries = 0

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const type = entry.entryType as string
            if (type === "largest-contentful-paint") {
              result.lcp = entry.startTime
            } else if (type === "layout-shift") {
              const lsEntry = entry as unknown as { hadRecentInput: boolean; value: number }
              if (!lsEntry.hadRecentInput) {
                result.cls = (result.cls ?? 0) + lsEntry.value
              }
            } else if (type === "first-input") {
              const fiEntry = entry as unknown as { processingStart: number }
              result.inp = fiEntry.processingStart - entry.startTime
            } else if (type === "paint" && entry.name === "first-contentful-paint") {
              result.fcp = entry.startTime
            } else if (type === "navigation") {
              const nav = entry as unknown as { responseStart: number; requestStart: number }
              result.ttfb = nav.responseStart - nav.requestStart
            }
            entries++
          }
          if (entries >= 10) resolve(result)
        })

        const opts = { buffered: true }
        observer.observe({ ...opts, type: "largest-contentful-paint" } as PerformanceObserverInit)
        observer.observe({ ...opts, type: "layout-shift" } as PerformanceObserverInit)
        observer.observe({ ...opts, type: "first-input" } as PerformanceObserverInit)
        observer.observe({ ...opts, type: "paint" } as PerformanceObserverInit)
        observer.observe({ ...opts, type: "navigation" } as PerformanceObserverInit)

        setTimeout(() => resolve(result), 3000)
      })
    })

    await browser.close()

      return {
      performance: 0,
      accessibility: 0,
      seo: 0,
      best_practices: 0,
      core_web_vitals: {
        lcp: metrics.lcp,
        inp: metrics.inp,
        cls: metrics.cls,
        ttfb: metrics.ttfb,
        fcp: metrics.fcp,
      },
    }
  } catch {
    return null
  }
}

export function evaluateWebVitals(
  vitals: LighthouseResult["core_web_vitals"],
  thresholds: LighthouseThresholds,
): Array<{ metric: string; value: number; threshold: number; status: "good" | "needs_improvement" | "poor" }> {
  const results: Array<{ metric: string; value: number; threshold: number; status: "good" | "needs_improvement" | "poor" }> = []

  if (vitals.lcp != null) {
    results.push({
      metric: "LCP",
      value: vitals.lcp,
      threshold: thresholds.lcp,
      status: vitals.lcp <= 2500 ? "good" : vitals.lcp <= 4000 ? "needs_improvement" : "poor",
    })
  }

  if (vitals.inp != null) {
    results.push({
      metric: "INP",
      value: vitals.inp,
      threshold: thresholds.inp,
      status: vitals.inp <= 200 ? "good" : vitals.inp <= 500 ? "needs_improvement" : "poor",
    })
  }

  if (vitals.cls != null) {
    results.push({
      metric: "CLS",
      value: vitals.cls,
      threshold: thresholds.cls,
      status: vitals.cls <= 0.1 ? "good" : vitals.cls <= 0.25 ? "needs_improvement" : "poor",
    })
  }

  if (vitals.ttfb != null) {
    results.push({
      metric: "TTFB",
      value: vitals.ttfb,
      threshold: 800,
      status: vitals.ttfb <= 800 ? "good" : vitals.ttfb <= 1800 ? "needs_improvement" : "poor",
    })
  }

  return results
}

export async function enrichPageModelWithVitals(
  page: NormalizedPageModel,
  thresholds?: Partial<LighthouseThresholds>,
): Promise<NormalizedPageModel> {
  const result = await runLighthouse(page.url, { thresholds })
  if (!result) return page

  return {
    ...page,
    core_web_vitals: result.core_web_vitals,
    lighthouse_scores: {
      performance: result.performance,
      accessibility: result.accessibility,
      seo: result.seo,
      best_practices: result.best_practices,
    },
  }
}

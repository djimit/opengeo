import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import type { NormalizedPageModel } from "@opengeo/shared"

export interface RenderOptions {
  timeout_ms: number
  wait_for_idle_ms: number
  user_agent: string
  viewport_width: number
  viewport_height: number
  max_scrolls: number
  scroll_delay_ms: number
}

export interface RenderResult {
  html: string
  render_method: "javascript"
  hydration_detected: boolean
  render_time_ms: number
  resource_count: number
  js_errors: string[]
}

const DEFAULT_OPTIONS: RenderOptions = {
  timeout_ms: 30_000,
  wait_for_idle_ms: 2_000,
  user_agent: "OpenGeoBot/0.1.0 (+https://github.com/DjimIT/opengeo) (Playwright)",
  viewport_width: 1280,
  viewport_height: 720,
  max_scrolls: 3,
  scroll_delay_ms: 500,
}

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true })
  }
  return browserInstance
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

export async function renderPage(
  url: string,
  options: Partial<RenderOptions> = {},
): Promise<RenderResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const start = Date.now()

  const browser = await getBrowser()
  const context = await browser.newContext({
    userAgent: opts.user_agent,
    viewport: { width: opts.viewport_width, height: opts.viewport_height },
  })

  const page = await context.newPage()
  const jsErrors: string[] = []
  let resourceCount = 0

  page.on("pageerror", (err) => jsErrors.push(err.message))
  page.on("request", () => resourceCount++)

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: opts.timeout_ms })

    // Detect hydration: wait for dynamic content to appear
    const hydrationDetected = await detectHydration(page, opts)

    // Scroll to trigger lazy loading
    await scrollPage(page, opts)

    // Wait for network idle
    await page.waitForLoadState("networkidle", { timeout: opts.wait_for_idle_ms }).catch(() => {})

    const html = await page.content()

    return {
      html,
      render_method: "javascript",
      hydration_detected: hydrationDetected,
      render_time_ms: Date.now() - start,
      resource_count: resourceCount,
      js_errors: jsErrors,
    }
  } finally {
    await context.close()
  }
}

async function detectHydration(page: Page, opts: RenderOptions): Promise<boolean> {
  try {
    // Check for common SPA framework indicators
    const hasReact = await page.evaluate(() => {
      return !!(window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
        document.querySelector("[data-reactroot], [data-reactid]") !== null
    }).catch(() => false)

    const hasVue = await page.evaluate(() => {
      return !!(window as unknown as Record<string, unknown>).__VUE__ ||
        document.querySelector("[data-v-app], [data-v-]") !== null
    }).catch(() => false)

    const hasAngular = await page.evaluate(() => {
      return !!(window as unknown as Record<string, unknown>).ng ||
        document.querySelector("[ng-version], [ng-app]") !== null
    }).catch(() => false)

    // Wait for content to stabilize
    const initialContent = await page.content()
    await page.waitForTimeout(1000)
    const afterContent = await page.content()
    const contentChanged = initialContent.length !== afterContent.length

    return hasReact || hasVue || hasAngular || contentChanged
  } catch {
    return false
  }
}

async function scrollPage(page: Page, opts: RenderOptions): Promise<void> {
  for (let i = 0; i < opts.max_scrolls; i++) {
    await page.evaluate((scrollY) => window.scrollBy(0, scrollY), opts.viewport_height)
    await page.waitForTimeout(opts.scroll_delay_ms)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

export async function renderToPageModel(
  url: string,
  baseModel: NormalizedPageModel,
  options?: Partial<RenderOptions>,
): Promise<NormalizedPageModel> {
  const result = await renderPage(url, options)

  return {
    ...baseModel,
    html_length: result.html.length,
    render_method: "javascript",
    hydration_detected: result.hydration_detected,
    render_time_ms: result.render_time_ms,
    resource_count: result.resource_count,
    js_errors: result.js_errors,
    raw_html: result.html,
  }
}

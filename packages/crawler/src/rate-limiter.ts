export interface RateLimitConfig {
  min_delay_ms: number
  max_delay_ms: number
  adaptive_backoff: boolean
  respect_crawl_delay: boolean
  max_concurrent_per_domain: number
  max_requests_per_second: number
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  min_delay_ms: 500,
  max_delay_ms: 5000,
  adaptive_backoff: true,
  respect_crawl_delay: true,
  max_concurrent_per_domain: 3,
  max_requests_per_second: 2,
}

export class RateLimiter {
  private lastRequestTime: number = 0
  private requestCount: number = 0
  private windowStart: number = 0
  private consecutiveErrors: number = 0
  private currentDelay: number
  private crawlDelay: number | null = null
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT, ...config }
    this.currentDelay = this.config.min_delay_ms
    this.windowStart = Date.now()
  }

  setCrawlDelay(delaySeconds: number): void {
    if (this.config.respect_crawl_delay) {
      this.crawlDelay = delaySeconds * 1000
    }
  }

  async wait(): Promise<void> {
    const now = Date.now()

    // Reset rate window every second
    if (now - this.windowStart >= 1000) {
      this.windowStart = now
      this.requestCount = 0
    }

    // Enforce max requests per second
    if (this.requestCount >= this.config.max_requests_per_second) {
      const waitTime = 1000 - (now - this.windowStart)
      if (waitTime > 0) {
        await sleep(waitTime)
      }
      this.windowStart = Date.now()
      this.requestCount = 0
    }

    // Calculate delay
    let delay = this.crawlDelay ?? this.currentDelay

    // Ensure minimum time between requests
    const timeSinceLast = now - this.lastRequestTime
    if (timeSinceLast < delay) {
      await sleep(delay - timeSinceLast)
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  reportSuccess(): void {
    this.consecutiveErrors = 0
    if (this.config.adaptive_backoff) {
      this.currentDelay = Math.max(
        this.config.min_delay_ms,
        this.currentDelay * 0.9,
      )
    }
  }

  reportError(statusCode?: number): void {
    this.consecutiveErrors++

    if (this.config.adaptive_backoff) {
      // Exponential backoff on errors
      const backoffFactor = Math.min(this.consecutiveErrors, 5)
      this.currentDelay = Math.min(
        this.config.max_delay_ms,
        this.currentDelay * (1.5 + backoffFactor * 0.5),
      )
    }

    // Special handling for rate limit responses
    if (statusCode === 429 || statusCode === 503) {
      this.currentDelay = Math.min(this.config.max_delay_ms, this.currentDelay * 2)
    }
  }

  getStats(): { currentDelay: number; consecutiveErrors: number; requestsInWindow: number } {
    return {
      currentDelay: this.currentDelay,
      consecutiveErrors: this.consecutiveErrors,
      requestsInWindow: this.requestCount,
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

import { test } from "node:test"
import assert from "node:assert/strict"
import { RateLimiter } from "../rate-limiter.js"

test("RateLimiter: waits at least min_delay between requests", async () => {
  const limiter = new RateLimiter({ min_delay_ms: 100, max_delay_ms: 5000, adaptive_backoff: false, respect_crawl_delay: false, max_concurrent_per_domain: 3, max_requests_per_second: 100 })

  const start = Date.now()
  await limiter.wait()
  await limiter.wait()
  const elapsed = Date.now() - start

  assert.ok(elapsed >= 90, `Expected at least 90ms delay, got ${elapsed}ms`)
})

test("RateLimiter: increases delay on errors", () => {
  const limiter = new RateLimiter({ min_delay_ms: 100, max_delay_ms: 5000, adaptive_backoff: true, respect_crawl_delay: false, max_concurrent_per_domain: 3, max_requests_per_second: 100 })

  const initialDelay = limiter.getStats().currentDelay
  limiter.reportError(503)
  const afterError = limiter.getStats().currentDelay

  assert.ok(afterError > initialDelay, `Delay should increase after error: ${initialDelay} -> ${afterError}`)
})

test("RateLimiter: decreases delay on success after error", () => {
  const limiter = new RateLimiter({ min_delay_ms: 100, max_delay_ms: 5000, adaptive_backoff: true, respect_crawl_delay: false, max_concurrent_per_domain: 3, max_requests_per_second: 100 })

  limiter.reportError()
  limiter.reportError()
  const afterError = limiter.getStats().currentDelay
  limiter.reportSuccess()
  const afterSuccess = limiter.getStats().currentDelay

  assert.ok(afterSuccess < afterError, `Delay should decrease after success: ${afterError} -> ${afterSuccess}`)
})

test("RateLimiter: respects crawl-delay", async () => {
  const limiter = new RateLimiter({ min_delay_ms: 0, max_delay_ms: 5000, adaptive_backoff: false, respect_crawl_delay: true, max_concurrent_per_domain: 3, max_requests_per_second: 100 })

  limiter.setCrawlDelay(2)

  const start = Date.now()
  await limiter.wait()
  await limiter.wait()
  const elapsed = Date.now() - start

  assert.ok(elapsed >= 1900, `Expected at least 2s delay from crawl-delay, got ${elapsed}ms`)
})

test("RateLimiter: tracks consecutive errors", () => {
  const limiter = new RateLimiter({ min_delay_ms: 100, max_delay_ms: 5000, adaptive_backoff: true, respect_crawl_delay: false, max_concurrent_per_domain: 3, max_requests_per_second: 100 })

  limiter.reportError()
  limiter.reportError()
  limiter.reportError()

  assert.equal(limiter.getStats().consecutiveErrors, 3)
})

test("RateLimiter: success resets consecutive errors", () => {
  const limiter = new RateLimiter({ min_delay_ms: 100, max_delay_ms: 5000, adaptive_backoff: true, respect_crawl_delay: false, max_concurrent_per_domain: 3, max_requests_per_second: 100 })

  limiter.reportError()
  limiter.reportError()
  limiter.reportSuccess()

  assert.equal(limiter.getStats().consecutiveErrors, 0)
})

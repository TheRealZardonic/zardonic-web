import '@testing-library/jest-dom/vitest'

// Global mock for @upstash/ratelimit — the test suite mocks @upstash/redis
// with a minimal class that only covers the methods needed by each test.
// The @upstash/ratelimit package internally uses redis pipeline/script methods
// that are not present on the test stub, which would cause the rate-limiter to
// fail-closed (503) for every request. This global mock replaces the package
// with a no-op version that always allows requests, matching the development
// behaviour when KV is unconfigured.
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() { return {} }
    async limit() { return { success: true } }
  },
}))

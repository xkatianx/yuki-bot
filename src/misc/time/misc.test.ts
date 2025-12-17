import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sleep } from "./misc.js"

let timer: ReturnType<typeof vi.useFakeTimers>

beforeEach(() => {
  timer = vi.useFakeTimers()
})

afterEach(() => {
  timer.useRealTimers()
})

describe("misc", () => {
  describe("sleep", () => {
    it("should wait for the specified milliseconds", async () => {
      const sleepPromise = sleep(1000)
      let resolved = false

      void sleepPromise.then(() => {
        resolved = true
      })

      // Initially not resolved
      expect(resolved).toBe(false)

      // Fast-forward 500ms - still not resolved
      await timer.advanceTimersByTimeAsync(500)
      expect(resolved).toBe(false)

      // Fast-forward another 500ms - should be resolved
      await timer.advanceTimersByTimeAsync(500)
      await sleepPromise
      expect(resolved).toBe(true)
    })

    it("should handle zero milliseconds", async () => {
      const sleepPromise = sleep(0)
      await timer.advanceTimersByTimeAsync(0)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle small millisecond values", async () => {
      const sleepPromise = sleep(10)
      await timer.advanceTimersByTimeAsync(10)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle large millisecond values", async () => {
      const sleepPromise = sleep(5000)
      await timer.advanceTimersByTimeAsync(5000)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle fractional milliseconds", async () => {
      const sleepPromise = sleep(1234.56)
      await timer.advanceTimersByTimeAsync(1234.56)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle 30 seconds", async () => {
      const sleepPromise = sleep(30000)
      await timer.advanceTimersByTimeAsync(30000)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle 60 seconds (1 minute)", async () => {
      const sleepPromise = sleep(60000)
      await timer.advanceTimersByTimeAsync(60000)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle 5 minutes", async () => {
      const sleepPromise = sleep(300000)
      await timer.advanceTimersByTimeAsync(300000)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle 1 hour", async () => {
      const sleepPromise = sleep(3600000)
      await timer.advanceTimersByTimeAsync(3600000)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle very large values (24 hours)", async () => {
      const sleepPromise = sleep(86400000)
      await timer.advanceTimersByTimeAsync(86400000)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle negative milliseconds (resolves immediately)", async () => {
      const sleepPromise = sleep(-100)
      // Negative values cause setTimeout to fire immediately
      await timer.advanceTimersByTimeAsync(0)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle small negative values", async () => {
      const sleepPromise = sleep(-10)
      await timer.advanceTimersByTimeAsync(0)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle large negative values", async () => {
      const sleepPromise = sleep(-5000)
      await timer.advanceTimersByTimeAsync(0)
      await expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle very large negative values (1 hour)", async () => {
      const sleepPromise = sleep(-3600000)
      await timer.advanceTimersByTimeAsync(0)
      await expect(sleepPromise).resolves.toBeUndefined()
    })
  })
})

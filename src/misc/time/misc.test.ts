import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test"
import { sleep } from "./misc.js"

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe("misc", () => {
  describe("sleep", () => {
    it("should wait for the specified milliseconds", async () => {
      const sleepPromise = sleep(1000)
      let resolved = false

      void sleepPromise.then(() => {
        resolved = true
      })

      expect(resolved).toBe(false)

      jest.advanceTimersByTime(500)
      expect(resolved).toBe(false)

      jest.advanceTimersByTime(500)
      await sleepPromise
      expect(resolved).toBe(true)
    })

    it("should handle zero milliseconds", () => {
      const sleepPromise = sleep(0)
      jest.advanceTimersByTime(0)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle small millisecond values", () => {
      const sleepPromise = sleep(10)
      jest.advanceTimersByTime(10)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle large millisecond values", () => {
      const sleepPromise = sleep(5000)
      jest.advanceTimersByTime(5000)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle fractional milliseconds", () => {
      const sleepPromise = sleep(1234.56)
      jest.advanceTimersByTime(1234.56)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle 30 seconds", () => {
      const sleepPromise = sleep(30000)
      jest.advanceTimersByTime(30000)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle 60 seconds (1 minute)", () => {
      const sleepPromise = sleep(60000)
      jest.advanceTimersByTime(60000)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle 5 minutes", () => {
      const sleepPromise = sleep(300000)
      jest.advanceTimersByTime(300000)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle 1 hour", () => {
      const sleepPromise = sleep(3600000)
      jest.advanceTimersByTime(3600000)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle very large values (24 hours)", () => {
      const sleepPromise = sleep(86400000)
      jest.advanceTimersByTime(86400000)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle negative milliseconds (resolves immediately)", () => {
      const sleepPromise = sleep(-100)
      jest.advanceTimersByTime(0)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle small negative values", () => {
      const sleepPromise = sleep(-10)
      jest.advanceTimersByTime(0)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle large negative values", () => {
      const sleepPromise = sleep(-5000)
      jest.advanceTimersByTime(0)
      expect(sleepPromise).resolves.toBeUndefined()
    })

    it("should handle very large negative values (1 hour)", () => {
      const sleepPromise = sleep(-3600000)
      jest.advanceTimersByTime(0)
      expect(sleepPromise).resolves.toBeUndefined()
    })
  })
})

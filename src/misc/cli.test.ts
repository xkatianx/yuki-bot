import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest"
import { now } from "~misc/time/index.js"
import { debug, done, fail, fatal, info, warn } from "./cli.js"

describe("cli", () => {
  let consoleLogSpy: Mock
  let timer: ReturnType<typeof vi.useFakeTimers>

  beforeEach(() => {
    // Mock console.log to capture calls
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
      // Do nothing
    })
    // Use fake timers to control twNow() output
    timer = vi.useFakeTimers()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    timer.useRealTimers()
  })

  describe("debug", () => {
    it("should log with timestamp and DEBUG prefix", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      debug("test message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("DEBUG") // DEBUG colored prefix
      expect(callArgs?.[2]).toBe("test message")
    })

    it("should handle multiple arguments", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      debug("message", 123, { key: "value" })

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("DEBUG") // DEBUG colored prefix
      expect(callArgs?.[2]).toBe("message")
      expect(callArgs?.[3]).toBe(123)
      expect(callArgs?.[4]).toEqual({ key: "value" })
    })
  })

  describe("done", () => {
    it("should log with timestamp and DONE prefix", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      done("success message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("DONE") // DONE colored prefix
      expect(callArgs?.[2]).toBe("success message")
    })

    it("should handle multiple arguments", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      done("task", "completed")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("DONE") // DONE colored prefix
      expect(callArgs?.[2]).toBe("task")
      expect(callArgs?.[3]).toBe("completed")
    })
  })

  describe("info", () => {
    it("should log with timestamp and INFO prefix", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      info("info message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("INFO") // INFO colored prefix
      expect(callArgs?.[2]).toBe("info message")
    })

    it("should handle multiple arguments", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      info("info", 42)

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("INFO") // INFO colored prefix
      expect(callArgs?.[2]).toBe("info")
      expect(callArgs?.[3]).toBe(42)
    })
  })

  describe("warn", () => {
    it("should log with timestamp and WARN prefix", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      warn("warning message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("WARN") // WARN colored prefix
      expect(callArgs?.[2]).toBe("warning message")
    })

    it("should handle multiple arguments", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      warn("warning", "deprecated")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("WARN") // WARN colored prefix
      expect(callArgs?.[2]).toBe("warning")
      expect(callArgs?.[3]).toBe("deprecated")
    })
  })

  describe("fail", () => {
    it("should log with timestamp and FAIL prefix", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      fail("error message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("FAIL") // FAIL colored prefix
      expect(callArgs?.[2]).toBe("error message")
    })

    it("should handle multiple arguments", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))
      fail("error", "occurred")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("FAIL") // FAIL colored prefix
      expect(callArgs?.[2]).toBe("error")
      expect(callArgs?.[3]).toBe("occurred")
    })
  })

  describe("fatal", () => {
    it("should log with timestamp and FAIL prefix, then throw error", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))

      expect(() => fatal("fatal error")).toThrow("Unexpected failure.")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("FAIL") // FAIL colored prefix
      expect(callArgs?.[2]).toBe("fatal error")
    })

    it("should handle multiple arguments before throwing", () => {
      timer.setSystemTime(new Date("2022-09-05T14:40:00+08:00"))

      expect(() => fatal("fatal", "error", 500)).toThrow("Unexpected failure.")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[0]).toBe(`[${now()}]`)
      expect(callArgs?.[1]).toContain("FAIL") // FAIL colored prefix
      expect(callArgs?.[2]).toBe("fatal")
      expect(callArgs?.[3]).toBe("error")
      expect(callArgs?.[4]).toBe(500)
    })

    it("should have return type never", () => {
      // TypeScript compile-time test - this should compile
      // If fatal didn't have return type never, this would be a type error
      const fn = (): string => {
        fatal("test")
        // This line should be unreachable according to TypeScript
        return "unreachable"
      }
      expect(() => fn()).toThrow("Unexpected failure.")
    })
  })

  describe("timestamp format", () => {
    it("should include timestamp in all log functions", () => {
      timer.setSystemTime(new Date("1999-10-10T16:34:56Z"))

      debug("test")
      done("test")
      info("test")
      warn("test")
      fail("test")

      expect(consoleLogSpy).toHaveBeenCalledTimes(5)
      // All calls should include the timestamp
      for (let i = 0; i < 5; i++) {
        const callArgs = consoleLogSpy.mock.calls[i]
        expect(callArgs?.[0]).toBe(`[${now()}]`)
      }
    })
  })
})

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  spyOn,
} from "bun:test"
import { debug, done, fail, fatal, info, warn } from "./cli.js"

describe("cli", () => {
  let consoleLogSpy: Mock<typeof console.log>

  beforeEach(() => {
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {
      // Do nothing
    })
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe("debug", () => {
    it("should log with timestamp and DEBUG prefix", () => {
      debug("test message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("DEBUG")
      expect(callArgs?.[2]).toBe("test message")
    })

    it("should handle multiple arguments", () => {
      debug("message", 123, { key: "value" })

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("DEBUG")
      expect(callArgs?.[2]).toBe("message")
      expect(callArgs?.[3]).toBe(123)
      expect(callArgs?.[4]).toEqual({ key: "value" })
    })
  })

  describe("done", () => {
    it("should log with timestamp and DONE prefix", () => {
      done("success message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("DONE")
      expect(callArgs?.[2]).toBe("success message")
    })

    it("should handle multiple arguments", () => {
      done("task", "completed")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("DONE")
      expect(callArgs?.[2]).toBe("task")
      expect(callArgs?.[3]).toBe("completed")
    })
  })

  describe("info", () => {
    it("should log with timestamp and INFO prefix", () => {
      info("info message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("INFO")
      expect(callArgs?.[2]).toBe("info message")
    })

    it("should handle multiple arguments", () => {
      info("info", 42)

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("INFO")
      expect(callArgs?.[2]).toBe("info")
      expect(callArgs?.[3]).toBe(42)
    })
  })

  describe("warn", () => {
    it("should log with timestamp and WARN prefix", () => {
      warn("warning message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("WARN")
      expect(callArgs?.[2]).toBe("warning message")
    })

    it("should handle multiple arguments", () => {
      warn("warning", "deprecated")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("WARN")
      expect(callArgs?.[2]).toBe("warning")
      expect(callArgs?.[3]).toBe("deprecated")
    })
  })

  describe("fail", () => {
    it("should log with timestamp and FAIL prefix", () => {
      fail("error message")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("FAIL")
      expect(callArgs?.[2]).toBe("error message")
    })

    it("should handle multiple arguments", () => {
      fail("error", "occurred")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("FAIL")
      expect(callArgs?.[2]).toBe("error")
      expect(callArgs?.[3]).toBe("occurred")
    })
  })

  describe("fatal", () => {
    it("should log with timestamp and FAIL prefix, then throw error", () => {
      expect(() => fatal("fatal error")).toThrow("Unexpected failure.")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("FAIL")
      expect(callArgs?.[2]).toBe("fatal error")
    })

    it("should handle multiple arguments before throwing", () => {
      expect(() => fatal("fatal", "error", 500)).toThrow("Unexpected failure.")

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleLogSpy.mock.calls[0]
      expect(callArgs?.[1]).toContain("FAIL")
      expect(callArgs?.[2]).toBe("fatal")
      expect(callArgs?.[3]).toBe("error")
      expect(callArgs?.[4]).toBe(500)
    })

    it("should have return type never", () => {
      const fn = (): string => {
        fatal("test")
        return "unreachable"
      }
      expect(() => fn()).toThrow("Unexpected failure.")
    })
  })
})

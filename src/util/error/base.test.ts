import { describe, expect, it, vi } from "vitest"
import { err, ok } from "~util/result/index.js"
import { MyErrorBase } from "./base.js"

// Mock the fail function to avoid console output during tests
vi.mock("~misc/cli.js", () => ({
  fail: vi.fn(),
  fatal: vi.fn(),
}))

describe("MyErrorBase", () => {
  describe("constructor", () => {
    it("should create an error with code and message", () => {
      const error = new MyErrorBase(100, "Test error message")
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe("MyErrorBase")
      expect(error.code).toBe(100)
      expect(error.message).toBe("Test error message")
    })

    it("should be instance of Error", () => {
      const error = new MyErrorBase(200, "Another error")
      expect(error instanceof Error).toBe(true)
    })

    it("should have different codes for different instances", () => {
      const error1 = new MyErrorBase(1, "Error 1")
      const error2 = new MyErrorBase(2, "Error 2")
      expect(error1.code).toBe(1)
      expect(error2.code).toBe(2)
      expect(error1.code).not.toBe(error2.code)
    })
  })

  describe("fromError", () => {
    it("should convert Error to MyErrorBase", () => {
      const originalError = new Error("Original error message")
      originalError.stack = "Error stack trace"
      originalError.cause = new Error("Cause error")

      const error = MyErrorBase.fromError(originalError)

      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("Original error message")
      expect(error.stack).toBe("Error stack trace")
      expect(error.cause).toBe(originalError.cause)
    })

    it("should handle Error without cause", () => {
      const originalError = new Error("Error without cause")

      const error = MyErrorBase.fromError(originalError)

      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("Error without cause")
      expect(error.cause).toBeUndefined()
    })
  })

  describe("fromAny", () => {
    it("should convert string to MyErrorBase", () => {
      const error = MyErrorBase.fromAny("String error")
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("String error")
    })

    it("should convert number to MyErrorBase", () => {
      const error = MyErrorBase.fromAny(123)
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("123")
    })

    it("should convert null to MyErrorBase", () => {
      const error = MyErrorBase.fromAny(null)
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("null")
    })

    it("should convert undefined to MyErrorBase", () => {
      const error = MyErrorBase.fromAny(undefined)
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("undefined")
    })

    it("should convert object to MyErrorBase", () => {
      const error = MyErrorBase.fromAny({ key: "value" })
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("[object Object]")
    })

    it("should convert array to MyErrorBase", () => {
      const error = MyErrorBase.fromAny([1, 2, 3])
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("1,2,3")
    })
  })

  describe("try", () => {
    it("should return Ok for successful synchronous function", async () => {
      const result = await MyErrorBase.try(() => ok(42))
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBe(42)
    })

    it("should return Ok for successful async function", async () => {
      const result = await MyErrorBase.try(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return ok("success")
      })
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBe("success")
    })

    it("should return Err for Error thrown in function", async () => {
      const result = await MyErrorBase.try(() => {
        throw new Error("Test error")
      })
      expect(result.isErr()).toBe(true)
      const error = result.unwrapErr()
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("Test error")
    })

    it("should return Err for non-Error thrown in function", async () => {
      const result = await MyErrorBase.try(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "String error"
      })
      expect(result.isErr()).toBe(true)
      const error = result.unwrapErr()
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("String error")
    })

    it("should return Err for Result error", async () => {
      const result = await MyErrorBase.try(() => err("Result error"))
      expect(result.isErr()).toBe(true)
      expect(result.unwrapErr()).toBe("Result error")
    })

    it("should handle nested errors", async () => {
      const result = await MyErrorBase.try(() => {
        try {
          throw new Error("Inner error")
        } catch {
          throw new Error("Outer error")
        }
      })
      expect(result.isErr()).toBe(true)
      const error = result.unwrapErr()
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.message).toBe("Outer error")
    })
  })
})

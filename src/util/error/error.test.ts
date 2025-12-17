import { describe, expect, it, vi } from "vitest"
import { err, ok } from "~util/result/index.js"
import { MyErrorBase } from "./base.js"
import { MyError, MyErrorCode } from "./error.js"

// Mock the fail function to avoid console output during tests
vi.mock("~misc/cli.js", () => ({
  fail: vi.fn(),
  fatal: vi.fn(),
}))

describe("MyError", () => {
  describe("constructor", () => {
    it("should create an error with code and message", () => {
      const error = new MyError(MyErrorCode.UNEXPECTED, "Test error")
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(MyErrorBase)
      expect(error.name).toBe("MyError")
      expect(error.code).toBe(MyErrorCode.UNEXPECTED)
      expect(error.message).toBe("Test error")
    })

    it("should support all error codes", () => {
      const fatalError = new MyError(MyErrorCode.FATAL, "Fatal")
      const unexpectedError = new MyError(MyErrorCode.UNEXPECTED, "Unexpected")
      const unknownError = new MyError(MyErrorCode.UNKNOWN, "Unknown")
      const othersError = new MyError(MyErrorCode.OTHERS, "Others")

      expect(fatalError.code).toBe(MyErrorCode.FATAL)
      expect(unexpectedError.code).toBe(MyErrorCode.UNEXPECTED)
      expect(unknownError.code).toBe(MyErrorCode.UNKNOWN)
      expect(othersError.code).toBe(MyErrorCode.OTHERS)
    })
  })

  describe("fromError", () => {
    it("should convert Error to MyError with OTHERS code", () => {
      const originalError = new Error("Original error")
      originalError.stack = "Stack trace"
      originalError.cause = new Error("Cause")

      const error = MyError.fromError(originalError)

      expect(error).toBeInstanceOf(MyError)
      expect(error.code).toBe(MyErrorCode.OTHERS)
      expect(error.message).toBe("Original error")
      expect(error.stack).toBe("Stack trace")
      expect(error.cause).toBe(originalError.cause)
    })

    it("should handle Error without stack and cause", () => {
      const originalError = new Error("Simple error")
      const error = MyError.fromError(originalError)

      expect(error).toBeInstanceOf(MyError)
      expect(error.code).toBe(MyErrorCode.OTHERS)
      expect(error.message).toBe("Simple error")
    })
  })

  describe("fromAny", () => {
    it("should convert any value to MyError with UNKNOWN code", () => {
      const error = MyError.fromAny("String value")
      expect(error).toBeInstanceOf(MyError)
      expect(error.code).toBe(MyErrorCode.UNKNOWN)
      expect(error.message).toBe("String value")
    })

    it("should convert number to MyError", () => {
      const error = MyError.fromAny(42)
      expect(error).toBeInstanceOf(MyError)
      expect(error.code).toBe(MyErrorCode.UNKNOWN)
      expect(error.message).toBe("42")
    })

    it("should convert object to MyError", () => {
      const error = MyError.fromAny({ test: "value" })
      expect(error).toBeInstanceOf(MyError)
      expect(error.code).toBe(MyErrorCode.UNKNOWN)
      expect(error.message).toBe("[object Object]")
    })
  })

  describe("unexpected", () => {
    it("should create MyError with UNEXPECTED code", () => {
      const error = MyError.unexpected("test", "message")
      expect(error).toBeInstanceOf(MyError)
      expect(error.code).toBe(MyErrorCode.UNEXPECTED)
      expect(error.message).toBe("Unexpected error.")
    })

    it("should accept multiple log arguments", () => {
      const error1 = MyError.unexpected("single")
      const error2 = MyError.unexpected("multiple", "arguments", 123)

      expect(error1.code).toBe(MyErrorCode.UNEXPECTED)
      expect(error2.code).toBe(MyErrorCode.UNEXPECTED)
    })
  })

  describe("fatal", () => {
    it("should throw MyError with FATAL code", () => {
      try {
        MyError.fatal("test", "message")
        // @ts-expect-error should have thrown an error
        expect.unreachable("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(MyError)
        if (error instanceof MyError) {
          expect(error.code).toBe(MyErrorCode.FATAL)
          expect(error.message).toBe("Fatal error.")
        }
      }
    })

    it("should throw with FATAL code when called with different args", () => {
      try {
        MyError.fatal("test")
        // @ts-expect-error should have thrown an error
        expect.unreachable("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(MyError)
        if (error instanceof MyError) {
          expect(error.code).toBe(MyErrorCode.FATAL)
          expect(error.message).toBe("Fatal error.")
        }
      }
    })

    it("should accept multiple log arguments", () => {
      expect(() => {
        MyError.fatal("single")
      }).toThrow(MyError)

      expect(() => {
        MyError.fatal("multiple", "arguments", 456)
      }).toThrow(MyError)
    })
  })

  describe("try", () => {
    it("should return Ok for successful function", async () => {
      const result = await MyError.try(() => ok(100))
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBe(100)
    })

    it("should return Err with MyError for Error thrown", async () => {
      const result = await MyError.try(() => {
        throw new Error("Test error")
      })
      expect(result.isErr()).toBe(true)
      const error = result.unwrapErr()
      expect(error).toBeInstanceOf(MyError)
      expect(error.code).toBe(MyErrorCode.OTHERS)
      expect(error.message).toBe("Test error")
    })

    it("should return Err with MyError for non-Error thrown", async () => {
      const result = await MyError.try(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "String error"
      })
      expect(result.isErr()).toBe(true)
      const error = result.unwrapErr()
      expect(error).toBeInstanceOf(MyError)
      expect(error.code).toBe(MyErrorCode.UNKNOWN)
      expect(error.message).toBe("String error")
    })

    it("should accept functions that return two different ok types and two different err types", async () => {
      const result = await MyError.try(() => {
        if (Math.random() > 1) return ok(1 as const)
        if (Math.random() > 1) return ok(2 as const)
        if (Math.random() > 1) return err(3 as const)
        return err(4 as const)
      })
      expect(result.isErr()).toBe(true)
      expect(result.unwrapErr()).toBe(4)
    })
  })
})

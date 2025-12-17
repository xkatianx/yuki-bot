import { describe, expect, it, vi } from "vitest"
import { err, ok, type Result } from "../index.js"

describe("Result", () => {
  describe("Ok", () => {
    it("should create an Ok value", () => {
      const result = ok(42)
      expect(result.isOk()).toBe(true)
      expect(result.isErr()).toBe(false)
      expect(result.unwrap()).toBe(42)
    })
  })

  describe("Err", () => {
    it("should create an Err value", () => {
      const result = err("error message")
      expect(result.isOk()).toBe(false)
      expect(result.isErr()).toBe(true)
    })

    it("should throw on unwrap", () => {
      const result = err("error message")
      expect(result.unwrapErr()).toBe("error message")
    })
  })

  describe("expect", () => {
    it("should work with Ok", () => {
      const okResult = ok("value")
      expect(okResult.expect("should not be used")).toBe("value")
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      expect(() => errResult.expect("expected failure")).toThrow(
        "expected failure"
      )
    })

    it("should work with Result containing Ok", () => {
      const result: Result<string, number> = ok("value")
      expect(result.expect("should not be used")).toBe("value")
    })

    it("should work with Result containing Err", () => {
      const result: Result<string, number> = err(42)
      expect(() => result.expect("expected failure")).toThrow(
        "expected failure"
      )
    })
  })

  describe("unwrap", () => {
    it("should work with Ok", () => {
      const okResult = ok("value")
      expect(okResult.unwrap()).toBe("value")
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      expect(() => errResult.unwrap()).toThrow(
        "Called unwrap() on an Err value: boom"
      )
    })

    it("should work with Result containing Ok", () => {
      const result: Result<string, number> = ok("value")
      expect(result.unwrap()).toBe("value")
    })

    it("should work with Result containing Err", () => {
      const result: Result<string, number> = err(42)
      expect(() => result.unwrap()).toThrow()
    })
  })

  describe("unwrapErr", () => {
    it("should work with Ok", () => {
      const okResult = ok("value")
      expect(() => okResult.unwrapErr()).toThrow(
        "Called unwrapErr() on an Ok value: value"
      )
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      expect(errResult.unwrapErr()).toBe("boom")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<string, number> = ok("value")
      expect(() => result.unwrapErr()).toThrow()
    })

    it("should work with Result containing Err", () => {
      const result: Result<string, number> = err(42)
      expect(result.unwrapErr()).toBe(42)
    })
  })

  describe("unwrapOr", () => {
    it("should work with Ok", () => {
      const okResult = ok(42)
      expect(okResult.unwrapOr(0)).toBe(42)
    })

    it("should work with Err", () => {
      const errResult = err("error message")
      expect(errResult.unwrapOr(42)).toBe(42)
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(10)
      expect(result.unwrapOr(0)).toBe(10)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      expect(result.unwrapOr(0)).toBe(0)
    })
  })

  describe("unwrapOrElse", () => {
    it("should work with Ok", () => {
      const okResult = ok(10)
      const unwrappedOk = okResult.unwrapOrElse(() => 0)
      expect(unwrappedOk).toBe(10)
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      const unwrappedErr = errResult.unwrapOrElse((e) => `handled ${e}`)
      expect(unwrappedErr).toBe("handled boom")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(10)
      const unwrapped = result.unwrapOrElse(() => 0)
      expect(unwrapped).toBe(10)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const unwrapped = result.unwrapOrElse((e) => `handled ${e}`)
      expect(unwrapped).toBe("handled error")
    })
  })

  describe("map", () => {
    it("should work with Ok", () => {
      const okResult = ok(42)
        .map((x) => x * 2)
        .map((x) => x + 1)
      expect(okResult.unwrap()).toBe(85)
    })

    it("should work with Err", () => {
      const errResult = err("error message").map((x) => x * 2)
      expect(errResult.isErr()).toBe(true)
      expect(errResult.unwrapErr()).toBe("error message")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(5)
      const mapped = result.map((x) => x * 2)
      expect(mapped.isOk() && mapped.unwrap()).toBe(10)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const mapped = result.map((x) => x * 2)
      expect(mapped.isErr()).toBe(true)
    })
  })

  describe("mapErr", () => {
    it("should work with Ok", () => {
      const okResult = ok(42)
        .mapErr(() => "error")
        .map((x) => x * 2)
      expect(okResult.unwrap()).toBe(84)
    })

    it("should not call mapErr callback on Ok", () => {
      const spy = vi.fn()
      const okResult = ok(7).mapErr(spy)
      expect(okResult.isOk()).toBe(true)
      expect(okResult.unwrap()).toBe(7)
      expect(spy).not.toHaveBeenCalled()
    })

    it("should work with Err", () => {
      const errResult = err("error message").mapErr((e) => `new ${e}`)
      expect(errResult.isErr()).toBe(true)
      expect(errResult.unwrapErr()).toBe("new error message")
    })

    it("should allow chaining mapErr on Err", () => {
      const errResult = err("boom")
        .mapErr((e) => ({ code: "E_BOOM", message: e }))
        .mapErr((e) => `${e.code}:${e.message.toUpperCase()}`)
      expect(errResult.isErr()).toBe(true)
      expect(errResult.unwrapErr()).toBe("E_BOOM:BOOM")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(5)
      const mapped = result.mapErr((e) => `new ${e}`)
      expect(mapped.isOk() && mapped.unwrap()).toBe(5)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const mapped = result.mapErr((e) => `new ${e}`)
      expect(mapped.isErr() && mapped.unwrapErr()).toBe("new error")
    })
  })

  describe("mapOr", () => {
    it("should work with Ok", () => {
      const okResult = ok(10)
      const mappedOrOk = okResult.mapOr(0, (x) => x * 3)
      expect(mappedOrOk).toBe(30)
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      const mappedOrErr = errResult.mapOr(123, () => "never called")
      expect(mappedOrErr).toBe(123)
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(10)
      const mapped = result.mapOr(0, (x) => x * 3)
      expect(mapped).toBe(30)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const mapped = result.mapOr(0, (x) => x * 3)
      expect(mapped).toBe(0)
    })
  })

  describe("mapOrElse", () => {
    it("should work with Ok", () => {
      const okResult = ok(10)
      const mappedOrElseOk = okResult.mapOrElse(
        () => 0,
        (x) => x * 4
      )
      expect(mappedOrElseOk).toBe(40)
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      const mappedOrElseErr = errResult.mapOrElse(
        (e) => `default ${e}`,
        () => "never called"
      )
      expect(mappedOrElseErr).toBe("default boom")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(10)
      const mapped = result.mapOrElse(
        (e) => `default ${e}`,
        (x) => BigInt(x * 4)
      )
      expect(mapped).toBe(40n)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const mapped = result.mapOrElse(
        (e) => `default ${e}`,
        (x) => x * 4
      )
      expect(mapped).toBe("default error")
    })
  })

  describe("and", () => {
    it("should work with Ok", () => {
      const okResult = ok(5)
      const otherOk = ok(10)
      const errResult = err("error")
      const andOk = okResult.and(otherOk)
      expect(andOk.isOk()).toBe(true)
      expect(andOk.unwrap()).toBe(10)
      const andErr = okResult.and(errResult)
      expect(andErr.isErr()).toBe(true)
      expect(andErr.unwrapErr()).toBe("error")
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      const otherOk = ok(10)
      const andResult = errResult.and(otherOk)
      expect(andResult.isErr()).toBe(true)
      expect(andResult.unwrapErr()).toBe("boom")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(5)
      const andOk = result.and(ok(10))
      expect(andOk.isOk() && andOk.unwrap()).toBe(10)
      const andErr = result.and(err("error"))
      expect(andErr.isErr()).toBe(true)
      expect(andErr.unwrapErr()).toBe("error")
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const andOk = result.and(ok(10))
      expect(andOk.isErr()).toBe(true)
      expect(andOk.unwrapErr()).toBe("error")
      const andErr = result.and(err("new error"))
      expect(andErr.isErr()).toBe(true)
      expect(andErr.unwrapErr()).toBe("error")
    })
  })

  describe("andThen", () => {
    it("should work with Ok", () => {
      const okResult = ok(42)
        .andThen((x) => ok(x * 2))
        .andThen((x) => ok(x + 1))
      expect(okResult.unwrap()).toBe(85)
    })

    it("should work with Err", () => {
      const errResult = err("error message").andThen((x) => ok(x * 2))
      expect(errResult.isErr()).toBe(true)
      expect(errResult.unwrapErr()).toBe("error message")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(5)
      const chained = result.andThen((x) => ok(x * 2))
      expect(chained.isOk() && chained.unwrap()).toBe(10)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const chained = result.andThen((x) => ok(x * 2))
      expect(chained.isErr()).toBe(true)
    })
  })

  describe("or", () => {
    it("should work with Ok", () => {
      const okResult = ok(5)
      const orResult = okResult.or(err("other"))
      expect(orResult.isOk()).toBe(true)
      expect(orResult.unwrap()).toBe(5)
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      const otherOk = ok(10)
      const otherErr = err("other error")
      const orOk = errResult.or(otherOk)
      expect(orOk.isOk()).toBe(true)
      expect(orOk.unwrap()).toBe(10)
      const orErr = errResult.or(otherErr)
      expect(orErr.isErr()).toBe(true)
      expect(orErr.unwrapErr()).toBe("other error")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(5)
      const orOk = result.or(ok(10))
      expect(orOk.isOk()).toBe(true)
      expect(orOk.unwrap()).toBe(5)
      const orErr = result.or(err("error"))
      expect(orErr.isOk()).toBe(true)
      expect(orErr.unwrap()).toBe(5)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const orOk = result.or(ok(10))
      expect(orOk.isOk()).toBe(true)
      expect(orOk.unwrap()).toBe(10)
      const orErr = result.or(err("new error"))
      expect(orErr.isErr()).toBe(true)
      expect(orErr.unwrapErr()).toBe("new error")
    })
  })

  describe("orElse", () => {
    it("should work with Ok", () => {
      const okResult = ok(5)
      const orElseOk = okResult.orElse(() => err("other"))
      expect(orElseOk.isOk()).toBe(true)
      expect(orElseOk.unwrap()).toBe(5)
    })

    it("should work with Err", () => {
      const errResult = err("boom")
      const orElseErr = errResult.orElse((e) => ok(`fixed ${e}`))
      expect(orElseErr.isOk()).toBe(true)
      expect(orElseErr.unwrap()).toBe("fixed boom")
    })

    it("should work with Result containing Ok", () => {
      const result: Result<number, string> = ok(5)
      const orElseOk = result.orElse((e) => ok(`fixed ${e}`))
      expect(orElseOk.isOk()).toBe(true)
      expect(orElseOk.unwrap()).toBe(5)
      const orElseErr = result.orElse((e) => err(`fixed ${e}`))
      expect(orElseErr.isOk()).toBe(true)
      expect(orElseErr.unwrap()).toBe(5)
    })

    it("should work with Result containing Err", () => {
      const result: Result<number, string> = err("error")
      const orElseOk = result.orElse((e) => ok(`fixed ${e}`))
      expect(orElseOk.isOk()).toBe(true)
      expect(orElseOk.unwrap()).toBe("fixed error")
      const orElseErr = result.orElse((e) => err(`fixed ${e}`))
      expect(orElseErr.isErr()).toBe(true)
      expect(orElseErr.unwrapErr()).toBe("fixed error")
    })
  })

  describe("inspect", () => {
    it("should work with Ok", () => {
      let num = 0
      const okResult = ok(42)
      const inspected = okResult.inspect((x) => {
        num -= x
      })
      expect(inspected.unwrap()).toBe(42)
      expect(num).toBe(-42)
    })
    it("should work with Err", () => {
      const errResult = err("boom")
      let num = 0
      const inspected = errResult.inspect((_x) => {
        num += 1
      })
      expect(inspected.unwrapErr()).toBe("boom")
      expect(num).toBe(0)
    })
    it("should work with Result containing Ok", () => {
      let num = 0
      const result: Result<number, string> = ok(5)
      const inspected = result.inspect((x) => {
        num -= x
      })
      expect(inspected.unwrap()).toBe(5)
      expect(num).toBe(-5)
    })
    it("should work with Result containing Err", () => {
      let num = 0
      const result: Result<number, string> = err("error")
      const inspected = result.inspect((x) => {
        num -= x
      })
      expect(inspected.unwrapErr()).toBe("error")
      expect(num).toBe(0)
    })
  })

  describe("inspectErr", () => {
    it("should work with Ok", () => {
      let num = 0
      const okResult = ok(42)
      const inspected = okResult.inspectErr((_x) => {
        num += 1
      })
      expect(inspected.unwrap()).toBe(42)
      expect(num).toBe(0)
    })
    it("should work with Err", () => {
      let str = "!"
      const errResult = err("boom")
      const inspected = errResult.inspectErr((x) => {
        str += x
      })
      expect(inspected.unwrapErr()).toBe("boom")
      expect(str).toBe("!boom")
    })
    it("should work with Result containing Ok", () => {
      let num = 0
      const result: Result<number, number> = ok(5)
      const inspected = result.inspectErr((x) => {
        num += x
      })
      expect(inspected.unwrap()).toBe(5)
      expect(num).toBe(0)
    })
    it("should work with Result containing Err", () => {
      let str = "!"
      const result: Result<number, string> = err("error")
      const inspected = result.inspectErr((x) => {
        str += x
      })
      expect(inspected.unwrapErr()).toBe("error")
      expect(str).toBe("!error")
    })
  })

  describe("Type narrowing", () => {
    it("should narrow types correctly with isOk", () => {
      const result: Result<number, string> = ok(42)

      if (result.isOk()) {
        // TypeScript should know this is Ok<number>
        expect(result.value).toBe(42)
      }
    })

    it("should narrow types correctly with isErr", () => {
      const result: Result<number, string> = err("error")

      if (result.isErr()) {
        // TypeScript should know this is Err<string>
        expect(result.error).toBe("error")
      }
    })
  })
})

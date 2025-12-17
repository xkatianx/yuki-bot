import { assert, describe, expect, it } from "vitest"
import { err, ok } from "../index.js"
import AsyncResult from "./asyncResult"
import type { Result } from "./type.js"

describe("AsyncResult basics", () => {
  describe("from (sync)", () => {
    it("should create AsyncResult from Ok result", async () => {
      const result = ok(42)
      const asyncResult = AsyncResult.from(result)
      const resolved = await asyncResult
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(42)
      }
    })

    it("should create AsyncResult from Err result", async () => {
      const result = err("error message")
      const asyncResult = AsyncResult.from(result)
      const resolved = await asyncResult
      expect(resolved.isErr()).toBe(true)
      if (resolved.isErr()) {
        expect(resolved.error).toBe("error message")
      }
    })

    it("should create AsyncResult from function returning Ok Result", async () => {
      let called = false
      const fn = () => {
        called = true
        return ok(123)
      }
      const asyncResult = AsyncResult.from(fn)
      expect(called).toBe(true)
      const resolved = await asyncResult
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(123)
      }
    })

    it("should create AsyncResult from function returning Err Result", async () => {
      let called = false
      const fn = () => {
        called = true
        return err("sync error")
      }
      const asyncResult = AsyncResult.from(fn)
      expect(called).toBe(true)
      const resolved = await asyncResult
      expect(resolved.isErr()).toBe(true)
      if (resolved.isErr()) {
        expect(resolved.error).toBe("sync error")
      }
    })
  })

  describe("from (async)", () => {
    describe("with PromiseLike that resolves to Ok", () => {
      it("should create AsyncResult from Promise resolving to Ok", async () => {
        const promise = Promise.resolve(ok(42))
        const asyncResult = AsyncResult.from(promise)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe(42)
        }
      })

      it("should work with already resolved Promise", async () => {
        const promise = Promise.resolve(ok("test"))
        const asyncResult = AsyncResult.from(promise)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe("test")
        }
      })

      it("should work with pending Promise", async () => {
        const promise = new Promise<Result<number, never>>((resolve) => {
          setTimeout(() => {
            resolve(ok(100))
          }, 10)
        })
        const asyncResult = AsyncResult.from(promise)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe(100)
        }
      })

      it("should work with PromiseLike object", async () => {
        const promiseLike: PromiseLike<Result<number, never>> = {
          then: <TResult1 = Result<number, never>, TResult2 = never>(
            onfulfilled?:
              | ((
                  value: Result<number, never>
                ) => TResult1 | PromiseLike<TResult1>)
              | null,
            onrejected?:
              | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
              | null
          ): PromiseLike<TResult1 | TResult2> => {
            return Promise.resolve(ok(99)).then(onfulfilled, onrejected)
          },
        }
        const asyncResult = AsyncResult.from(promiseLike)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe(99)
        }
      })
    })

    describe("with PromiseLike that resolves to Err", () => {
      it("should create AsyncResult from Promise resolving to Err", async () => {
        const promise = Promise.resolve(err("error message"))
        const asyncResult = AsyncResult.from(promise)
        const resolved = await asyncResult
        expect(resolved.isErr()).toBe(true)
        if (resolved.isErr()) {
          expect(resolved.error).toBe("error message")
        }
      })

      it("should work with already resolved Promise", async () => {
        const promise = Promise.resolve(err(404))
        const asyncResult = AsyncResult.from(promise)
        const resolved = await asyncResult
        expect(resolved.isErr()).toBe(true)
        if (resolved.isErr()) {
          expect(resolved.error).toBe(404)
        }
      })

      it("should work with pending Promise", async () => {
        const promise = new Promise<Result<never, string>>((resolve) => {
          setTimeout(() => {
            resolve(err("pending"))
          }, 10)
        })
        const asyncResult = AsyncResult.from(promise)
        const resolved = await asyncResult
        expect(resolved.isErr()).toBe(true)
        if (resolved.isErr()) {
          expect(resolved.error).toBe("pending")
        }
      })
    })

    describe("with function returning PromiseLike that resolves to Ok", () => {
      it("should create AsyncResult from function returning Promise", async () => {
        const fn = () => Promise.resolve(ok(42))
        const asyncResult = AsyncResult.from(fn)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe(42)
        }
      })

      it("should call the function immediately when fromAsync is called", async () => {
        let called = false
        const fn = () => {
          called = true
          return Promise.resolve(ok(42))
        }
        const asyncResult = AsyncResult.from(fn)
        expect(called).toBe(true)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe(42)
        }
      })

      it("should work with function returning already resolved Promise", async () => {
        const fn = () => Promise.resolve(ok("lazy"))
        const asyncResult = AsyncResult.from(fn)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe("lazy")
        }
      })

      it("should work with function returning pending Promise", async () => {
        const fn = () =>
          new Promise<Result<number, never>>((resolve) => {
            setTimeout(() => {
              resolve(ok(200))
            }, 10)
          })
        const asyncResult = AsyncResult.from(fn)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe(200)
        }
      })

      it("should work with function returning PromiseLike object", async () => {
        const fn = (): PromiseLike<Result<number, never>> => ({
          then: <TResult1 = Result<number, never>, TResult2 = never>(
            onfulfilled?:
              | ((
                  value: Result<number, never>
                ) => TResult1 | PromiseLike<TResult1>)
              | null,
            onrejected?:
              | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
              | null
          ): PromiseLike<TResult1 | TResult2> => {
            return Promise.resolve(ok(88)).then(onfulfilled, onrejected)
          },
        })
        const asyncResult = AsyncResult.from(fn)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe(88)
        }
      })
    })

    describe("with function returning PromiseLike that resolves to Err", () => {
      it("should create AsyncResult from function returning Promise", async () => {
        const fn = () => Promise.resolve(err("function error"))
        const asyncResult = AsyncResult.from(fn)
        const resolved = await asyncResult
        expect(resolved.isErr()).toBe(true)
        if (resolved.isErr()) {
          expect(resolved.error).toBe("function error")
        }
      })

      it("should call the function immediately when fromAsync is called", async () => {
        let called = false
        const fn = () => {
          called = true
          return Promise.resolve(err("lazy error"))
        }
        const asyncResult = AsyncResult.from(fn)
        expect(called).toBe(true)
        const resolved = await asyncResult
        expect(resolved.isErr()).toBe(true)
        if (resolved.isErr()) {
          expect(resolved.error).toBe("lazy error")
        }
      })

      it("should work with function returning already resolved Promise", async () => {
        const fn = () => Promise.resolve(err(500))
        const asyncResult = AsyncResult.from(fn)
        const resolved = await asyncResult
        expect(resolved.isErr()).toBe(true)
        if (resolved.isErr()) {
          expect(resolved.error).toBe(500)
        }
      })

      it("should work with function returning pending Promise", async () => {
        const fn = () =>
          new Promise<Result<never, string>>((resolve) => {
            setTimeout(() => {
              resolve(err("delayed"))
            }, 10)
          })
        const asyncResult = AsyncResult.from(fn)
        const resolved = await asyncResult
        expect(resolved.isErr()).toBe(true)
        if (resolved.isErr()) {
          expect(resolved.error).toBe("delayed")
        }
      })
    })

    describe("with Promise that rejects", () => {
      it("should propagate rejection from Promise", async () => {
        const promise = Promise.reject(new Error("rejected"))
        const asyncResult = AsyncResult.from(promise)
        await expect(asyncResult).rejects.toThrow("rejected")
      })

      it("should propagate rejection from pending Promise", async () => {
        const promise = new Promise<Result<number, never>>((_, reject) => {
          setTimeout(() => {
            reject(new Error("timeout"))
          }, 10)
        })
        const asyncResult = AsyncResult.from(promise)
        await expect(asyncResult).rejects.toThrow("timeout")
      })

      it("should propagate rejection with non-Error value", async () => {
        const promise = Promise.reject(new Error("string error"))
        const asyncResult = AsyncResult.from(promise)
        await expect(asyncResult).rejects.toThrow("string error")
      })
    })

    describe("with function that throws synchronously", () => {
      it("should throw immediately when fromAsync is called", () => {
        const fn = () => {
          throw new Error("sync throw")
        }
        expect(() => AsyncResult.from(fn)).toThrow("sync throw")
      })

      it("should throw immediately with non-Error value", () => {
        const fn = () => {
          throw new Error("string throw")
        }
        expect(() => AsyncResult.from(fn)).toThrow("string throw")
      })
    })

    describe("with function returning Promise that rejects", () => {
      it("should propagate rejection from function-returned Promise", async () => {
        const fn = () => Promise.reject(new Error("function rejection"))
        const asyncResult = AsyncResult.from(fn)
        await expect(asyncResult).rejects.toThrow("function rejection")
      })

      it("should call function immediately when fromAsync is called", async () => {
        let called = false
        const fn = () => {
          called = true
          return Promise.reject(new Error("called and rejected"))
        }
        const asyncResult = AsyncResult.from(fn)
        expect(called).toBe(true)
        await expect(asyncResult).rejects.toThrow("called and rejected")
      })

      it("should propagate rejection with non-Error value", async () => {
        const fn = () => Promise.reject(new Error("123"))
        const asyncResult = AsyncResult.from(fn)
        await expect(asyncResult).rejects.toThrow("123")
      })
    })

    describe("edge cases", () => {
      it("should handle multiple calls to fromAsync with same Promise", async () => {
        const promise = Promise.resolve(ok(42))
        const asyncResult1 = AsyncResult.from(promise)
        const asyncResult2 = AsyncResult.from(promise)
        const [resolved1, resolved2] = await Promise.all([
          asyncResult1,
          asyncResult2,
        ])
        expect(resolved1.isOk()).toBe(true)
        expect(resolved2.isOk()).toBe(true)
        if (resolved1.isOk() && resolved2.isOk()) {
          expect(resolved1.value).toBe(42)
          expect(resolved2.value).toBe(42)
        }
      })

      it("should handle multiple calls to fromAsync with same function", async () => {
        let callCount = 0
        const fn = () => {
          callCount++
          return Promise.resolve(ok(callCount))
        }
        const asyncResult1 = AsyncResult.from(fn)
        const asyncResult2 = AsyncResult.from(fn)
        const [resolved1, resolved2] = await Promise.all([
          asyncResult1,
          asyncResult2,
        ])
        expect(callCount).toBe(2)
        expect(resolved1.isOk()).toBe(true)
        expect(resolved2.isOk()).toBe(true)
        if (resolved1.isOk() && resolved2.isOk()) {
          expect(resolved1.value).toBe(1)
          expect(resolved2.value).toBe(2)
        }
      })

      it("should handle function that returns different Results on each call", async () => {
        let callCount = 0
        const fn = () => {
          callCount++
          return Promise.resolve(
            callCount % 2 === 0 ? ok(callCount) : err(callCount)
          )
        }
        const asyncResult1 = AsyncResult.from(fn)
        const asyncResult2 = AsyncResult.from(fn)
        const [resolved1, resolved2] = await Promise.all([
          asyncResult1,
          asyncResult2,
        ])
        expect(resolved1.isErr()).toBe(true)
        expect(resolved2.isOk()).toBe(true)
        if (resolved1.isErr() && resolved2.isOk()) {
          expect(resolved1.error).toBe(1)
          expect(resolved2.value).toBe(2)
        }
      })

      it("should work with complex Result types", async () => {
        type ComplexResult = Result<{ id: number; name: string }, string>
        const promise: Promise<ComplexResult> = Promise.resolve(
          ok({ id: 1, name: "test" })
        )
        const asyncResult = AsyncResult.from(promise)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toEqual({ id: 1, name: "test" })
        }
      })

      it("should work with AsyncResult returned from function", async () => {
        const fn = () => AsyncResult.from(ok(42))
        const asyncResult = AsyncResult.from(fn)
        const resolved = await asyncResult
        expect(resolved.isOk()).toBe(true)
        if (resolved.isOk()) {
          expect(resolved.value).toBe(42)
        }
      })
    })
  })

  describe("map", () => {
    it("should map Ok value with sync function", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const mapped = asyncResult.map((x) => x * 2)
      const resolved = await mapped
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(10)
      }
    })

    it("should map Ok value with async function", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const mapped = asyncResult.map((x) => Promise.resolve(x * 2))
      const resolved = await mapped
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(10)
      }
    })

    it("should not map Err value", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const mapped = asyncResult.map((x) => x * 2)
      const resolved = await mapped
      expect(resolved.isErr()).toBe(true)
      if (resolved.isErr()) {
        expect(resolved.error).toBe("error")
      }
    })
  })

  describe("mapErr", () => {
    it("should map Err value with sync function", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const mapped = asyncResult.mapErr((e) => `mapped: ${e}`)
      const resolved = await mapped
      expect(resolved.isErr()).toBe(true)
      if (resolved.isErr()) {
        expect(resolved.error).toBe("mapped: error")
      }
    })

    it("should map Err value with async function", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const mapped = asyncResult.mapErr((e) => Promise.resolve(`mapped: ${e}`))
      const resolved = await mapped
      expect(resolved.isErr()).toBe(true)
      if (resolved.isErr()) {
        expect(resolved.error).toBe("mapped: error")
      }
    })

    it("should not map Ok value", async () => {
      const asyncResult = AsyncResult.from(ok(42))
      const mapped = asyncResult.mapErr(() => "mapped")
      const resolved = await mapped
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(42)
      }
    })
  })

  describe("andThen", () => {
    it("should chain Ok to Ok with sync function", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const chained = asyncResult.andThen((x) => ok(x * 2))
      const resolved = await chained
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(10)
      }
    })

    it("should chain Ok to Ok with async function returning Result", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const chained = asyncResult.andThen((x) => Promise.resolve(ok(x * 2)))
      const resolved = await chained
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(10)
      }
    })

    it("should chain Ok to Ok with async function returning AsyncResult", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const chained = asyncResult.andThen(async (x) =>
        AsyncResult.from(ok(x * 2))
      )
      const resolved = await chained
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(10)
      }
    })

    it("should chain Ok to Err", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const chained = asyncResult.andThen(() => err("chain error"))
      const resolved = await chained
      expect(resolved.isErr()).toBe(true)
      if (resolved.isErr()) {
        expect(resolved.error).toBe("chain error")
      }
    })

    it("should not chain Err value", async () => {
      const asyncResult = AsyncResult.from(err("original error"))
      const chained = asyncResult.andThen((x) => ok(x * 2))
      const resolved = await chained
      expect(resolved.isErr()).toBe(true)
      if (resolved.isErr()) {
        expect(resolved.error).toBe("original error")
      }
    })
  })

  describe("and", () => {
    it("should return second result if first is Ok", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const combined = asyncResult.and(ok(10))
      const resolved = await combined
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(10)
      }
    })

    it("should return first Err if first is Err", async () => {
      const asyncResult = AsyncResult.from(err("first error"))
      const combined = asyncResult.and(ok(10))
      const resolved = await combined
      expect(resolved.isErr()).toBe(true)
      if (resolved.isErr()) {
        expect(resolved.error).toBe("first error")
      }
    })

    it("should work with AsyncResult", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const combined = asyncResult.and(AsyncResult.from(ok(10)))
      const resolved = await combined
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(10)
      }
    })
  })

  describe("orElse", () => {
    it("should handle Err with sync function", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const recovered = asyncResult.orElse(() => ok(42))
      const resolved = await recovered
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(42)
      }
    })

    it("should handle Err with async function returning Result", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const recovered = asyncResult.orElse(() => Promise.resolve(ok(42)))
      const resolved = await recovered
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(42)
      }
    })

    it("should handle Err with async function returning AsyncResult", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const recovered = asyncResult.orElse(async () => AsyncResult.from(ok(42)))
      const resolved = await recovered
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(42)
      }
    })

    it("should not handle Ok value", async () => {
      const asyncResult = AsyncResult.from(ok(42))
      const recovered = asyncResult.orElse(() => ok(100))
      const resolved = await recovered
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(42)
      }
    })
  })

  describe("or", () => {
    it("should return second result if first is Err", async () => {
      const asyncResult = AsyncResult.from(err("first error"))
      const combined = asyncResult.or(ok(42))
      const resolved = await combined
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(42)
      }
    })

    it("should return first Ok if first is Ok", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const combined = asyncResult.or(ok(42))
      const resolved = await combined
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(5)
      }
    })

    it("should work with AsyncResult", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const combined = asyncResult.or(AsyncResult.from(ok(42)))
      const resolved = await combined
      expect(resolved.isOk()).toBe(true)
      if (resolved.isOk()) {
        expect(resolved.value).toBe(42)
      }
    })
  })

  describe("inspect", () => {
    it("should work with Ok", async () => {
      let num = 100
      const asyncResult = AsyncResult.from(ok(42)).inspect((x) => {
        num += x
      })
      expect(num).toBe(100)
      const inspected = await asyncResult
      expect(num).toBe(142)
      expect(inspected.isOk()).toBe(true)
      expect(inspected.unwrap()).toBe(42)
    })
    it("should work with Err", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const inspected = await asyncResult.inspect((_x) => {
        assert.fail("This line should not have been reached")
      })
      expect(inspected.isErr()).toBe(true)
      expect(inspected.unwrapErr()).toBe("error")
    })
  })

  describe("inspectErr", () => {
    it("should work with Ok", async () => {
      const asyncResult = AsyncResult.from(ok(42)).inspectErr((_x) => {
        assert.fail("This line should not have been reached")
      })
      const inspected = await asyncResult
      expect(inspected.isOk()).toBe(true)
      expect(inspected.unwrap()).toBe(42)
    })
    it("should work with Err", async () => {
      let str = "!"
      const asyncResult = AsyncResult.from(err("error")).inspectErr((x) => {
        str += x
      })
      expect(str).toBe("!")
      const inspected = await asyncResult
      expect(str).toBe("!error")
      expect(inspected.isErr()).toBe(true)
      expect(inspected.unwrapErr()).toBe("error")
    })
  })

  describe("then", () => {
    it("should work as Promise with onfulfilled", async () => {
      const asyncResult = AsyncResult.from(ok(42))
      const value = await asyncResult.then((result) => {
        if (result.isOk()) {
          return result.value
        }
        throw new Error("Unexpected error")
      })
      expect(value).toBe(42)
    })

    it("should work with Promise chain", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const value = await asyncResult
        .then((result) => (result.isOk() ? result.value : 0))
        .then((x) => x * 2)
      expect(value).toBe(10)
    })

    it("should handle errors in then chain", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const value = await asyncResult.then((result) => {
        if (result.isOk()) {
          return result.value
        }
        return -1
      })
      expect(value).toBe(-1)
    })
  })

  describe("complex chains", () => {
    it("should chain multiple map operations", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const result = await asyncResult
        .map((x) => x * 2)
        .map((x) => x + 1)
        .map((x) => Promise.resolve(x * 2))

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe(22) // (5 * 2 + 1) * 2
      }
    })

    it("should chain map and andThen", async () => {
      const asyncResult = AsyncResult.from(ok(5))
      const result = await asyncResult
        .map((x) => x * 2)
        .andThen((x) => ok(x + 1))

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe(11) // 5 * 2 + 1
      }
    })

    it("should handle error recovery with orElse", async () => {
      const asyncResult = AsyncResult.from(err("error"))
      const result = await asyncResult.orElse(() => ok(42)).map((x) => x * 2)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe(84)
      }
    })
  })
})

describe("AsyncResult utils", () => {
  describe("merge", () => {
    it("should merge multiple ok AsyncResults", async () => {
      const asyncResults = AsyncResult.merge([
        AsyncResult.from(ok(1)),
        AsyncResult.from(ok("2")),
        AsyncResult.from(ok(3n)),
      ])
      const results = await asyncResults
      expect(results.isOk()).toBe(true)
      const contents = results.unwrap()
      expect(contents).toEqual([1, "2", 3n])
    })

    it("should merge to the first err AsyncResult", async () => {
      const asyncResults = AsyncResult.merge([
        AsyncResult.from(ok("1")),
        AsyncResult.from(err("2")),
        AsyncResult.from(ok(3)),
        AsyncResult.from(err(4)),
      ])
      const results = await asyncResults
      expect(results.isErr()).toBe(true)
      const error = results.unwrapErr()
      expect(error).toBe("2")
    })

    it("should not early reject on Err value", async () => {
      const called = [false, false, false]
      const fn = (i: number) => {
        called[i] = true
        return Promise.resolve(err(i))
      }
      const asyncResults = AsyncResult.merge([fn(0), fn(1), fn(2)])
      const results = await asyncResults
      expect(called).toEqual([true, true, true])
      expect(results.isErr()).toBe(true)
      expect(results.unwrapErr()).toBe(0)
    })
  })
})

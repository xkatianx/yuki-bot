import { describe, expect, it } from "vitest"
import { AsyncResult, err, ok } from "~util/result"
import { Cache } from "./cache"

describe("Cache", () => {
  describe("getOrSet", () => {
    describe("with sync Result", () => {
      it("should return cached value if exists", () => {
        const cache = new Cache<number>()
        cache.set("key1", 42)

        const result = cache.getOrSet("key1", () => ok(100))
        expect(result.isOk()).toBe(true)
        expect(result.unwrap()).toBe(42)
      })

      it("should set and return value if not cached (Ok)", () => {
        const cache = new Cache<number>()
        const result = cache.getOrSet("key1", () => ok(42))

        expect(result.isOk()).toBe(true)
        expect(result.unwrap()).toBe(42)
        expect(cache.get("key1")).toBe(42)
      })

      it("should not cache on Err", () => {
        const cache = new Cache<number>()
        const result = cache.getOrSet("key1", () => err("error"))

        expect(result.isErr()).toBe(true)
        expect(result.unwrapErr()).toBe("error")
        expect(cache.get("key1")).toBeNull()
      })

      it("should return cached value even if function returns Err", () => {
        const cache = new Cache<number>()
        cache.set("key1", 42)

        const result = cache.getOrSet("key1", () => err("error"))
        expect(result.isOk()).toBe(true)
        expect(result.unwrap()).toBe(42)
      })
    })

    describe("with async Promise<Result>", () => {
      it("should return cached value if exists", async () => {
        const cache = new Cache<number>()
        cache.set("key1", 42)

        const result = await cache.getOrSet("key1", () =>
          Promise.resolve(ok(100))
        )
        expect(result.isOk()).toBe(true)
        expect(result.unwrap()).toBe(42)
      })

      it("should set and return value if not cached (Ok)", async () => {
        const cache = new Cache<number>()
        const result = await cache.getOrSet("key1", () =>
          Promise.resolve(ok(42))
        )

        expect(result.isOk()).toBe(true)
        expect(result.unwrap()).toBe(42)
        expect(cache.get("key1")).toBe(42)
      })

      it("should not cache on Err", async () => {
        const cache = new Cache<number>()
        const result = await cache.getOrSet("key1", () =>
          Promise.resolve(err("error"))
        )

        expect(result.isErr()).toBe(true)
        expect(result.unwrapErr()).toBe("error")
        expect(cache.get("key1")).toBeNull()
      })

      it("should single-flight concurrent async calls", async () => {
        const cache = new Cache<number>()
        let callCount = 0

        const fn = async () => {
          callCount++
          await new Promise((resolve) => setTimeout(resolve, 10))
          return ok(42)
        }

        const [result1, result2] = await Promise.all([
          cache.getOrSet("key1", fn),
          cache.getOrSet("key1", fn),
        ])

        expect(result1.isOk() && result1.unwrap()).toBe(42)
        expect(result2.isOk() && result2.unwrap()).toBe(42)
        expect(callCount).toBe(1)
      })

      it("should handle race condition - first call sets, second gets cached", async () => {
        const cache = new Cache<number>()
        let callCount = 0

        const fn = () => {
          callCount++
          return Promise.resolve(ok(42))
        }

        const [result1, result2] = await Promise.all([
          cache.getOrSet("key1", fn),
          cache.getOrSet("key1", fn),
        ])

        // Both should get the same value
        expect(result1.isOk() && result1.unwrap()).toBe(42)
        expect(result2.isOk() && result2.unwrap()).toBe(42)
        // Function should ONLY be called once due to single-flighting
        expect(callCount).toBe(1)
      })
    })

    describe("with AsyncResult", () => {
      it("should return cached value if exists", async () => {
        const cache = new Cache<number>()
        cache.set("key1", 42)

        const result = await cache.getOrSet("key1", () =>
          AsyncResult.from(ok(100))
        )
        expect(result.isOk()).toBe(true)
        expect(result.unwrap()).toBe(42)
      })

      it("should set and return value if not cached (Ok)", async () => {
        const cache = new Cache<number>()
        const result = await cache.getOrSet("key1", () =>
          AsyncResult.from(ok(42))
        )

        expect(result.isOk()).toBe(true)
        expect(result.unwrap()).toBe(42)
        expect(cache.get("key1")).toBe(42)
      })

      it("should not cache on Err", async () => {
        const cache = new Cache<number>()
        const result = await cache.getOrSet("key1", () =>
          AsyncResult.from(err("error"))
        )

        expect(result.isErr()).toBe(true)
        expect(result.unwrapErr()).toBe("error")
        expect(cache.get("key1")).toBeNull()
      })
    })
  })

  describe("get", () => {
    it("should return null for non-existent key", () => {
      const cache = new Cache<number>()
      expect(cache.get("nonexistent")).toBeNull()
    })

    it("should return cached value", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)
      expect(cache.get("key1")).toBe(42)
    })

    it("should return null after reset", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)
      cache.reset("key1")
      expect(cache.get("key1")).toBeNull()
    })
  })

  describe("reset", () => {
    it("should return null for non-existent key", () => {
      const cache = new Cache<number>()
      expect(cache.reset("nonexistent")).toBeNull()
    })

    it("should remove and return cached value", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)
      const removed = cache.reset("key1")

      expect(removed).toBe(42)
      expect(cache.get("key1")).toBeNull()
    })

    it("should remove value from cache", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)
      cache.reset("key1")
      expect(cache.get("key1")).toBeNull()
    })
  })

  describe("set", () => {
    it("should set value and return null if key doesn't exist", () => {
      const cache = new Cache<number>()
      const oldValue = cache.set("key1", 42)

      expect(oldValue).toBeNull()
      expect(cache.get("key1")).toBe(42)
    })

    it("should replace existing value and return old value", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)
      const oldValue = cache.set("key1", 100)

      expect(oldValue).toBe(42)
      expect(cache.get("key1")).toBe(100)
    })

    it("should overwrite existing value", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)
      cache.set("key1", 100)
      expect(cache.get("key1")).toBe(100)
    })
  })

  describe("integration", () => {
    it("should handle multiple keys independently", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)
      cache.set("key2", 100)

      expect(cache.get("key1")).toBe(42)
      expect(cache.get("key2")).toBe(100)
    })

    it("should work with different value types", () => {
      const stringCache = new Cache<string>()
      stringCache.set("key1", "value1")
      expect(stringCache.get("key1")).toBe("value1")

      const objectCache = new Cache<{ id: number }>()
      const obj = { id: 1 }
      objectCache.set("key1", obj)
      expect(objectCache.get("key1")).toBe(obj)
    })

    it("should handle getOrSet after set", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)

      const result = cache.getOrSet("key1", () => ok(100))
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBe(42)
    })

    it("should handle getOrSet after reset", () => {
      const cache = new Cache<number>()
      cache.set("key1", 42)
      cache.reset("key1")

      const result = cache.getOrSet("key1", () => ok(100))
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBe(100)
      expect(cache.get("key1")).toBe(100)
    })
  })
})

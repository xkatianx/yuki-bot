import type { Result } from "always-panic"
import { AsyncResult, ok } from "always-panic"

/**
 * A small, in‑memory cache keyed by `string`.
 *
 * - Values are stored as plain `V` in a private `Map`.
 * - Reads are **synchronous** (`get`, `getOrSet` with sync supplier).
 * - Writes can be driven by either:
 *   - a synchronous `Result<V, E>`
 *   - a `Promise<Result<V, E>>`
 *   - an `AsyncResult<V, E>`
 *
 * This class is **intentionally not single‑flight** for async suppliers:
 * if multiple callers race to `getOrSet` the same `key` concurrently and
 * it is not yet cached, the supplier function may be invoked more than once.
 * Only the first successful `Ok` result wins and is stored in the cache.
 */
export class Cache<V> {
  #map = new Map<string, V>()
  #pending = new Map<string, Promise<Result<V, unknown>>>()

  /**
   * Get a cached value, or compute and cache it on miss.
   *
   * - If `key` is already present, returns `Ok(cachedValue)` immediately
   *   without calling `fn`, regardless of whether `fn` would return `Ok` or `Err`.
   * - If `key` is missing and an async supplier is already running for this `key`,
   *   returns the **same promise** (single-flighting).
   * - If `key` is missing and no supplier is running, it calls `fn` and:
   *   - on `Ok(v)`: stores `v` under `key` and returns `Ok(v)`
   *   - on `Err(e)`: **does not** cache anything and returns `Err(e)`
   *
   * The supplier can be:
   * - a sync `() => Result<V, E>`
   * - an async `() => Promise<Result<V, E>>`
   * - an async `() => AsyncResult<V, E>`
   *
   * @throws inherits
   */
  getOrSet<E>(key: string, fn: () => Result<V, E>): Result<V, E>
  getOrSet<E>(
    key: string,
    fn: () => Promise<Result<V, E>> | AsyncResult<V, E>
  ): Result<V, E> | Promise<Result<V, E>>
  getOrSet<E>(
    key: string,
    fn: () => Result<V, E> | Promise<Result<V, E>> | AsyncResult<V, E>
  ): Result<V, E> | Promise<Result<V, E>> {
    const cached = this.#map.get(key)
    if (cached != null) return ok(cached)

    const pending = this.#pending.get(key)
    if (pending != null) return pending as Promise<Result<V, E>>

    const res1 = fn()
    if (res1 instanceof Promise || res1 instanceof AsyncResult) {
      const promise = Promise.resolve(res1).then((res2: Result<V, E>) => {
        this.#pending.delete(key)
        return res2.map((v) => {
          const cached = this.#map.get(key)
          if (cached != null) return cached
          this.#map.set(key, v)
          return v
        })
      })
      this.#pending.set(key, promise as Promise<Result<V, unknown>>)
      return promise
    } else {
      return res1.map((v) => {
        const cached = this.#map.get(key)
        if (cached != null) return cached
        this.#map.set(key, v)
        return v
      })
    }
  }

  /**
   * Get the value from the cache.
   * @param key - The key to get the value for.
   * @returns The value from the cache or null if it is not in the cache.
   */
  get(key: string): V | null {
    return this.#map.get(key) ?? null
  }

  /**
   * Remove the value from the cache.
   * @param key - The key to remove the value for.
   * @returns the removed value or null if it is not in the cache.
   */
  reset(key: string): V | null {
    const val = this.#map.get(key)
    if (val == null) return null
    this.#map.delete(key)
    return val
  }

  /**
   * Set the value in the cache.
   * @param key - The key to set the value for.
   * @param val - The value to set in the cache.
   * @returns the old value or null if it is not in the cache.
   */
  set(key: string, val: V): V | null {
    const b = this.reset(key)
    this.getOrSet(key, () => ok(val))
    return b
  }
}

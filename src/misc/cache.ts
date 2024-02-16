import { Ok, Result } from './result.js'

export class Cache<V> {
  #map = new Map<string, V>()

  getOrSet<E> (key: string, fn: () => Result<V, E>): Result<V, E>
  getOrSet<E> (
    key: string,
    fn: () => Promise<Result<V, E>>
  ): Result<V, E> | Promise<Result<V, E>>
  getOrSet<E> (
    key: string,
    fn: () => Result<V, E> | Promise<Result<V, E>>
  ): Result<V, E> | Promise<Result<V, E>> {
    if (this.#map.has(key)) return Ok(this.#map.get(key) as V)

    const res1 = fn()
    if (res1 instanceof Promise) {
      return res1.then(res2 => 
        res2.map(v => {
          this.#map.set(key, v)
          return v
        })
      )
    } else {
      return res1.map(v => {
        this.#map.set(key, v)
        return v
      })
    }
  }

  /**
   * @returns the removed value or null
   */
  reset (key: string): V | null {
    const val = this.#map.get(key)
    if (val == null) return null
    this.#map.delete(key)
    return val
  }

  /**
   * @returns the old value or null
   */
  set (key: string, val: V): V | null {
    const b = this.reset(key)
    this.getOrSet(key, () => Ok(val))
    return b
  }
}

/* TODO
 - call drop in reset
*/

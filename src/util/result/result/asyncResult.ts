import { err, ok } from "../index.js"
import type {
  AsyncResultErrTypes,
  AsyncResultOkTypes,
  ErrContent,
  OkContent,
  Result,
  ResultLike,
} from "./type.js"
import util from "./util.js"

class AsyncResult<T, E> {
  constructor(protected readonly promise: Promise<Result<T, E>>) {}

  /**
   * Create an AsyncResult from a Result, a PromiseLike, or a function returning a Result or a PromiseLike.
   * @param input - A Result, a PromiseLike, or a function returning a Result or a PromiseLike.
   * @returns An AsyncResult.
   * @throws inherits
   */
  static from<R extends Result<OkContent<R>, ErrContent<R>>>(
    input: R | PromiseLike<R> | (() => R | PromiseLike<R>)
  ): AsyncResult<OkContent<R>, ErrContent<R>> {
    return new AsyncResult(
      typeof input === "function"
        ? Promise.resolve(input())
        : Promise.resolve(input)
    )
  }

  protected transform<R extends Result<OkContent<R>, ErrContent<R>>>(
    fn: (r: Result<T, E>) => Promise<R>
  ): AsyncResult<OkContent<R>, ErrContent<R>> {
    return new AsyncResult(this.promise.then(fn))
  }

  map<T2>(fn: (value: T) => T2 | Promise<T2>): AsyncResult<T2, E> {
    return this.transform(async (r) => (r.isOk() ? ok(await fn(r.value)) : r))
  }

  mapErr<E2>(fn: (error: E) => E2 | Promise<E2>): AsyncResult<T, E2> {
    return this.transform(async (r) => (r.isErr() ? err(await fn(r.error)) : r))
  }

  and<R2 extends ResultLike<R2>>(
    res: R2 | PromiseLike<R2>
  ): AsyncResult<OkContent<R2>, E | ErrContent<R2>> {
    return this.andThen(() => res)
  }

  andThen<R2 extends ResultLike<R2>>(
    fn: (value: T) => R2 | PromiseLike<R2>
  ): AsyncResult<OkContent<R2>, E | ErrContent<R2>> {
    return this.transform(async (r) => (r.isOk() ? await fn(r.value) : r))
  }

  or<R2 extends ResultLike<R2>>(
    res: R2 | PromiseLike<R2>
  ): AsyncResult<T | OkContent<R2>, ErrContent<R2>> {
    return this.orElse(() => res)
  }

  orElse<R2 extends ResultLike<R2>>(
    fn: (error: E) => R2 | PromiseLike<R2>
  ): AsyncResult<T | OkContent<R2>, ErrContent<R2>> {
    return this.transform(async (r) => (r.isErr() ? await fn(r.error) : r))
  }

  then<TResult1 = Result<T, E>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<T, E>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected)
  }

  inspect(fn: (value: T) => void | Promise<void>) {
    return this.transform(async (r) => {
      if (r.isOk()) await fn(r.value)
      return r
    })
  }

  inspectErr(fn: (error: E) => void | Promise<void>) {
    return this.transform(async (r) => {
      if (r.isErr()) await fn(r.error)
      return r
    })
  }

  /**
   * AsyncResult version of `Promise.all`, but without early rejection.
   * @param results - An array of AsyncResults to merge.
   * @returns An AsyncResult that is either an array of all Ok values
   * or the first Err value.
   * @example
   * // ok
   * const asyncResult1 = AsyncResult.from(ok(1))
   * const asyncResult2 = AsyncResult.from(ok("2"))
   * const asyncResult3 = AsyncResult.from(ok(3n))
   * const merged = await AsyncResult.merge([asyncResult1, asyncResult2, asyncResult3])
   * expect(merged.unwrap()).toEqual([1, "2", 3n])
   * // err
   * const asyncResult1 = AsyncResult.from(ok(1))
   * const asyncResult2 = AsyncResult.from(err("2"))
   * const asyncResult3 = AsyncResult.from(err(3n))
   * const merged = await AsyncResult.merge([asyncResult1, asyncResult2, asyncResult3])
   * expect(merged.unwrapErr()).toBe("2")
   */
  static merge<const T extends PromiseLike<Result<unknown, unknown>>[]>(
    results: T
  ): AsyncResult<AsyncResultOkTypes<T>, AsyncResultErrTypes<T>[number]> {
    // @ts-expect-error this should be correct, verified in unit tests
    return new AsyncResult(Promise.all(results).then(util.all))
  }
}

export default AsyncResult

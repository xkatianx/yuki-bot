/* eslint-disable */
import { Err, Ok, ErrImpl, OkImpl, Result } from 'ts-results-es'
import { MyError } from '../error.js'
// const { Err, Ok, ErrImpl, OkImpl } = pkg
ErrImpl.prototype.andThenAsync = function (_: any) {
  return this
}
OkImpl.prototype.andThenAsync = async function (fn: any) {
  return await fn(this.value)
}
ErrImpl.prototype.mapAsync = function (_: any) {
  return this
}
OkImpl.prototype.mapAsync = async function (fn: any) {
  return Ok(await fn(this.value))
}
ErrImpl.prototype.unwrapOrElse = function (fn: any) {
  return fn(this.error)
}
OkImpl.prototype.unwrapOrElse = function (_: any) {
  return this.value
}
declare module 'ts-results-es' {
  interface ErrImpl<E> {
    andThenAsync(fn: unknown): ErrImpl<E>
    mapAsync(fn: unknown): ErrImpl<E>
    /**
     * Returns the contained `Ok` value or a provided default.
     *
     * (This is the `unwrap_or_else` in rust)
     */
    unwrapOrElse<T2>(fn: (err: E) => T2): T2
  }
  interface OkImpl<T> {
    andThenAsync<T2>(fn: (val: T) => Promise<OkImpl<T2>>): Promise<OkImpl<T2>>
    andThenAsync<E2>(
      fn: (val: T) => Promise<ErrImpl<E2>>
    ): Promise<Result<T, E2>>
    andThenAsync<T2, E2>(
      fn: (val: T) => Promise<Result<T2, E2>>
    ): Promise<Result<T2, E2>>
    mapAsync<U>(fn: (val: T) => Promise<U>): Promise<OkImpl<U>>
    /**
     * Returns the contained `Ok` value or a provided default.
     *
     * (This is the `unwrap_or_else` in rust)
     */
    unwrapOrElse(fn: unknown): T
  }
}
// export type Result<T, E> = pkg.Result<T, E>
export { Err, Ok, Result }

export async function awaitedResult<T, E>(
  res: Result<T, E>
): Promise<Result<Awaited<T>, Awaited<E>>> {
  if (res.isOk()) return Ok(await res.value)
  if (res.isErr()) return Err(await res.error)
  MyError.fatal('results.ts does not work properly.')
}

/* TODO
https://github.com/microsoft/TypeScript/issues/57356
wait until maybe TS 5.5.0 to replace all the union error type assertion
by `.mapErr(e => e)`
and get rid of "as any" and "@ts-ignore"
*/

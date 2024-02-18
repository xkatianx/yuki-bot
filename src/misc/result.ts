/* eslint-disable */
import { Err, Ok, ErrImpl, OkImpl, Result } from "ts-results-es";
import { MyError } from "../error.js";

ErrImpl.prototype.andThenAsync = function (_: any) {
  return this;
};
OkImpl.prototype.andThenAsync = async function (fn: any) {
  return await fn(this.value);
};
ErrImpl.prototype.mapAsync = function (_: any) {
  return this;
};
OkImpl.prototype.mapAsync = async function (fn: any) {
  return Ok(await fn(this.value));
};
ErrImpl.prototype.orElseAsync = async function (fn: any) {
  return await fn(this.error);
};
OkImpl.prototype.orElseAsync = function (_: any) {
  return this;
};
ErrImpl.prototype.unwrapOrElse = function (fn: any) {
  return fn(this.error);
};
OkImpl.prototype.unwrapOrElse = function (_: any) {
  return this.value;
};
declare module "ts-results-es" {
  interface ErrImpl<E> {
    orElseAsync<T2>(fn: (err: E) => Promise<OkImpl<T2>>): Promise<OkImpl<T2>>;
    orElseAsync<E2>(fn: (err: E) => Promise<ErrImpl<E2>>): Promise<ErrImpl<E2>>;
    orElseAsync<T2, E2>(
      fn: (err: E) => Promise<Result<T2, E2>>
    ): Promise<Result<T2, E2>>;
    orElseAsync<R extends Result<OkContent<R>, ErrContent<R>>>(
      fn: (err: E) => Promise<R>
    ): Promise<R>;
    andThenAsync(fn: unknown): ErrImpl<E>;
    mapAsync(fn: unknown): ErrImpl<E>;
    /**
     * Returns the contained `Ok` value or a provided default.
     *
     * (This is the `unwrap_or_else` in rust)
     */
    unwrapOrElse<T2>(fn: (err: E) => T2): T2;
  }
  interface OkImpl<T> {
    orElseAsync(fn: unknown): OkImpl<T>;
    andThenAsync<T2>(fn: (val: T) => Promise<OkImpl<T2>>): Promise<OkImpl<T2>>;
    andThenAsync<E2>(
      fn: (val: T) => Promise<ErrImpl<E2>>
    ): Promise<ErrImpl<E2>>;
    andThenAsync<T2, E2>(
      fn: (val: T) => Promise<Result<T2, E2>>
    ): Promise<Result<T2, E2>>;
    andThenAsync<R extends Result<OkContent<R>, ErrContent<R>>>(
      fn: (val: T) => Promise<R>
    ): Promise<R>;
    mapAsync<U>(fn: (val: T) => Promise<U>): Promise<OkImpl<U>>;
    /**
     * Returns the contained `Ok` value or a provided default.
     *
     * (This is the `unwrap_or_else` in rust)
     */
    unwrapOrElse(fn: unknown): T;
  }
}
export { Err, Ok, Result };

export async function awaitedResult<T, E>(
  res: Result<T, E>
): Promise<Result<Awaited<T>, Awaited<E>>> {
  if (res.isOk()) return Ok(await res.value);
  if (res.isErr()) return Err(await res.error);
  MyError.fatal("results.ts does not work properly.");
}

type OkContent<T> = T extends OkImpl<infer U> ? U : never;
type ErrContent<T> = T extends ErrImpl<infer U> ? U : never;

/** This does nothing in JS. Just help TS to know a Result is a Result. */
export function asResult<T extends Result<OkContent<T>, ErrContent<T>>>(
  res: T
): Result<OkContent<T>, ErrContent<T>> {
  return res;
}

/** This wraps an (async) Result-returning function and runs it.
 * This does nothing in JS.
 * Just helps TS to know the result is a Result.
 */
export function asResultFn<T extends Result<OkContent<T>, ErrContent<T>>>(
  resFn: () => T
): Result<OkContent<T>, ErrContent<T>>;
export function asResultFn<T extends Result<OkContent<T>, ErrContent<T>>>(
  resFn: () => Promise<T>
): Promise<Result<OkContent<T>, ErrContent<T>>>;
export function asResultFn<T extends Result<OkContent<T>, ErrContent<T>>>(
  resFn: () => T | Promise<T>
):
  | Result<OkContent<T>, ErrContent<T>>
  | Promise<Result<OkContent<T>, ErrContent<T>>> {
  return resFn();
}

/* TODO
https://github.com/microsoft/TypeScript/issues/57356
wait until maybe TS 5.5.0 to get rid of some asResult()
*/

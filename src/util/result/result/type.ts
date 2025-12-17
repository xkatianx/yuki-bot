import type Err from "./err"
import type Ok from "./ok"

export type OkContent<T> = T extends Ok<infer U> ? U : never
export type ErrContent<T> = T extends Err<infer U> ? U : never

export type Result<T, E> = Ok<T> | Err<E>
export type ResultLike<R> = Result<OkContent<R>, ErrContent<R>>

export type MaybeResult<T, E = unknown> = T | Result<T, E>

export type ResultOkTypes<T extends Result<unknown, unknown>[]> = {
  [key in keyof T]: T[key] extends Result<unknown, unknown>
    ? OkContent<T[key]>
    : never
}
export type ResultErrTypes<T extends Result<unknown, unknown>[]> = {
  [key in keyof T]: T[key] extends Result<unknown, unknown>
    ? ErrContent<T[key]>
    : never
}

export type AsyncResultOkTypes<
  T extends PromiseLike<Result<unknown, unknown>>[],
> = {
  [key in keyof T]: T[key] extends PromiseLike<Result<unknown, unknown>>
    ? OkContent<Awaited<T[key]>>
    : never
}
export type AsyncResultErrTypes<
  T extends PromiseLike<Result<unknown, unknown>>[],
> = {
  [key in keyof T]: T[key] extends PromiseLike<Result<unknown, unknown>>
    ? ErrContent<Awaited<T[key]>>
    : never
}

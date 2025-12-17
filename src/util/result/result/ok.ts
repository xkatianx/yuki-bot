/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import type { ErrContent, OkContent, Result } from "./type.js"

class Ok<T> {
  constructor(public readonly value: T) {}

  isOk(): this is Ok<T> {
    return true
  }

  isErr(): this is never {
    return false
  }

  expect(_message: string): T {
    return this.value
  }

  unwrap(): T {
    return this.value
  }

  unwrapErr(): never {
    throw new Error(`Called unwrapErr() on an Ok value: ${String(this.value)}`)
  }

  unwrapOr<T2>(_defaultValue: T2): T {
    return this.value
  }

  unwrapOrElse<_>(_fn: unknown): T {
    return this.value
  }

  map<T2>(fn: (value: T) => T2): Ok<T2> {
    return new Ok(fn(this.value))
  }

  mapErr<_>(_fn: unknown): this {
    return this
  }

  mapOr<U1, U2>(_defaultValue: U1, fn: (value: T) => U2): U2 {
    return fn(this.value)
  }

  mapOrElse<_, U2>(_defaultValue: unknown, fn: (value: T) => U2): U2 {
    return fn(this.value)
  }

  and<R extends Result<OkContent<R>, ErrContent<R>>>(res: R): R {
    return res
  }

  andThen<R extends Result<OkContent<R>, ErrContent<R>>>(
    fn: (value: T) => R
  ): R {
    return fn(this.value)
  }

  or(_res: unknown): this {
    return this
  }

  orElse(_fn: unknown): this {
    return this
  }

  inspect(fn: (value: T) => void): this {
    fn(this.value)
    return this
  }

  inspectErr(_fn: unknown): this {
    return this
  }
}

export default Ok

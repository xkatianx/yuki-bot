/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ErrContent, OkContent, Result } from "./result.js";

export class Ok<T> {
  constructor(public readonly value: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is never {
    return false;
  }

  expect(_message: string): T {
    return this.value;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr<T2>(_defaultValue: T2): T {
    return this.value;
  }

  unwrapOrElse<T2>(_fn: (error: never) => T2): T {
    return this.value;
  }

  map<T2>(fn: (value: T) => T2): Ok<T2> {
    return new Ok(fn(this.value));
  }

  mapErr<E2>(_fn: (error: never) => E2): Ok<T> {
    return this;
  }

  mapOr<U1, U2>(_defaultValue: U1, fn: (value: T) => U2): U2 {
    return fn(this.value);
  }

  mapOrElse<U1, U2>(
    _defaultValue: (error: never) => U1,
    fn: (value: T) => U2,
  ): U2 {
    return fn(this.value);
  }

  and<R extends Result<OkContent<R>, ErrContent<R>>>(res: R): R {
    return res;
  }

  andThen<R extends Result<OkContent<R>, ErrContent<R>>>(
    fn: (value: T) => R,
  ): R {
    return fn(this.value);
  }

  or(_res: unknown): Ok<T> {
    return this;
  }

  orElse(_fn: unknown): Ok<T> {
    return this;
  }
}

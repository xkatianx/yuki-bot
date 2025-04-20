/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ErrContent, OkContent, Result } from "./result.js";

export class Err<E> {
  constructor(public readonly error: E) {}

  isOk(): this is never {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  expect(message: string): never {
    throw new Error(message);
  }

  unwrap(): never {
    throw new Error(`Called unwrap() on an Err value: ${String(this.error)}`);
  }

  unwrapOr<T2>(defaultValue: T2): T2 {
    return defaultValue;
  }

  unwrapOrElse<T2>(fn: (error: E) => T2): T2 {
    return fn(this.error);
  }

  map<T2>(_fn: (value: never) => T2): Err<E> {
    return this;
  }

  mapErr<E2>(fn: (error: E) => E2): Err<E2> {
    return new Err(fn(this.error));
  }

  mapOr<U1, U2>(defaultValue: U1, _fn: (value: never) => U2): U1 {
    return defaultValue;
  }

  mapOrElse<U1, U2>(
    defaultValue: (error: E) => U1,
    _fn: (value: never) => U2,
  ): U1 {
    return defaultValue(this.error);
  }

  and(_res: unknown): Err<E> {
    return this;
  }

  andThen(_fn: unknown): Err<E> {
    return this;
  }

  or<R extends Result<OkContent<R>, ErrContent<R>>>(res: R): R {
    return res;
  }

  orElse<R extends Result<OkContent<R>, ErrContent<R>>>(
    fn: (error: E) => R,
  ): R {
    return fn(this.error);
  }
}

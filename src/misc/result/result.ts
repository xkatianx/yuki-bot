import { Err } from "./err.js";
import { Ok } from "./ok.js";

export type OkContent<T> = T extends Ok<infer U> ? U : never;
export type ErrContent<T> = T extends Err<infer U> ? U : never;

export type Result<T, E> = Ok<T> | Err<E>;

// Helper functions
export function ok<T>(value: T): Result<T, never> {
  return new Ok(value);
}

export function err<E>(error: E): Result<never, E> {
  return new Err(error);
}

function asIs<T extends Result<OkContent<T>, ErrContent<T>>>(
  res: T,
): Result<OkContent<T>, ErrContent<T>> {
  return res;
}

function wrap<T, E>(fn: () => T): Result<T, E> {
  try {
    return ok(fn());
  } catch (e) {
    return err(e as E);
  }
}
async function wrapAsync<T, E>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e as E);
  }
}

export const result = {
  asIs,
  wrap,
  wrapAsync,
};

import Err from "./err.js"
import Ok from "./ok.js"
import type {
  ErrContent,
  OkContent,
  Result,
  ResultErrTypes,
  ResultLike,
  ResultOkTypes,
} from "./type.js"

function ok<T>(value: T): Result<T, never> {
  return new Ok(value)
}

function err<E>(error: E): Result<never, E> {
  return new Err(error)
}

function asIs<T extends Result<OkContent<T>, ErrContent<T>>>(
  res: T
): Result<OkContent<T>, ErrContent<T>> {
  return res
}

function wrapError(e: unknown) {
  if (e instanceof Error) return err(e)
  else return err(new Error(String(e)))
}

/**
 * Parse a set of `Result`s, returning an array of all `Ok` values.
 * Short circuits with the first `Err` found, if any
 */
function all<const T extends Result<unknown, unknown>[]>(
  results: T
): Result<ResultOkTypes<T>, ResultErrTypes<T>[number]> {
  const okResult = []
  for (const result of results) {
    if (result.isOk()) {
      okResult.push(result.value)
    } else {
      return result as Err<ResultErrTypes<T>[number]>
    }
  }

  return ok(okResult as ResultOkTypes<T>)
}

function wrapFn<R extends ResultLike<R>>(fn: () => R) {
  return asIs(fn())
}

function isResult<T, E>(value: unknown): value is Result<T, E> {
  return value instanceof Ok || value instanceof Err
}

function parseUrl(url: string) {
  try {
    return ok(new URL(url))
  } catch (e) {
    if (e instanceof Error) return err(e)
    else return err(new Error(String(e)))
  }
}

export default {
  ok,
  err,
  asIs,
  wrapError,
  all,
  wrapFn,
  isResult,
  parseUrl,
}

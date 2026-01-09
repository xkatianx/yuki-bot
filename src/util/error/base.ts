import { fail } from "~misc/cli.js"
import type { ErrContent, OkContent, ResultLike } from "~util/result/index.js"
import { AsyncResult, err } from "~util/result/index.js"

// maybe string is better?
export type Code = number

export class MyErrorBase<T extends Code> extends Error {
  readonly code: T

  constructor(code: T, message: string) {
    super(message)
    this.name = "MyErrorBase"
    this.code = code
  }

  changeMessage(message: string | ((message: string) => string)): this {
    this.message = message instanceof Function ? message(this.message) : message
    return this
  }

  static fromError(e: Error): MyErrorBase<Code> {
    fail(e)
    const err = new MyErrorBase(0, e.message)
    if (e.stack) err.stack = e.stack
    if (e.cause) err.cause = e.cause
    return err
  }

  static fromAny(e: unknown): MyErrorBase<Code> {
    fail(e)
    return new MyErrorBase(0, String(e))
  }

  static try<T extends typeof MyErrorBase, R extends ResultLike<R>>(
    this: T,
    fn: () => R | Promise<R>
  ): AsyncResult<
    OkContent<R>,
    ErrContent<R> | ReturnType<T["fromError"]> | ReturnType<T["fromAny"]>
  > {
    return AsyncResult.from(async () => {
      try {
        return await fn()
      } catch (error) {
        if (error instanceof Error)
          return err(this.fromError(error) as ReturnType<T["fromError"]>)
        return err(this.fromAny(error) as ReturnType<T["fromAny"]>)
      }
    })
  }
}

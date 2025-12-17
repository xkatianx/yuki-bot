import type { ToLog } from "~misc/cli.js"
import { fail } from "~misc/cli.js"
import { MyErrorBase } from "./base.js"

export enum MyErrorCode {
  /** unexpected error. better shut down the program in case */
  FATAL,
  /** unexpected error. but no need to shut down */
  UNEXPECTED,
  /** some classes not extending Error are thrown */
  UNKNOWN,
  /** some errors thrown by others' packages not dealt */
  OTHERS,
}

export class MyError<T extends MyErrorCode> extends MyErrorBase<T> {
  constructor(code: T, message: string) {
    super(code, message)
    this.name = "MyError"
  }

  static override fromError(e: Error) {
    fail(e)
    const err = new MyError(MyErrorCode.OTHERS, e.message)
    if (e.stack) err.stack = e.stack
    if (e.cause) err.cause = e.cause
    return err
  }

  static override fromAny(e: unknown) {
    fail(e)
    return new MyError(MyErrorCode.UNKNOWN, String(e))
  }

  static unexpected(...toLog: ToLog) {
    fail(...toLog)
    return new MyError(MyErrorCode.UNEXPECTED, "Unexpected error.")
  }

  static fatal(...toLog: ToLog): never {
    fail(...toLog)
    throw new MyError(MyErrorCode.FATAL, "Fatal error.")
  }
}

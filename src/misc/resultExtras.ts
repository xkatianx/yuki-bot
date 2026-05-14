import { MyError, MyErrorCode, err, ok, type Result } from "always-panic"
import type { ToLog } from "./cli.js"
import { fail } from "./cli.js"

export function parseUrlResult(url: string): Result<URL, Error> {
  try {
    return ok(new URL(url))
  } catch (e) {
    if (e instanceof Error) return err(e)
    return err(new Error(String(e)))
  }
}

export function unexpectedMyError(
  ...toLog: ToLog
): MyError<MyErrorCode.OTHERS> {
  fail(...toLog)
  return new MyError(MyErrorCode.OTHERS, "Unexpected error.")
}

import { fail } from './misc/cli.js'
import { Err, Result } from './misc/result.js'

const counter = { val: -1 }
export type Code = number

export function uid (): Code {
  return counter.val--
}

export enum MyErrorCode {
  /** unexpected error. better shut down the program in case */
  FATAL = uid(),
  /** unexpected error. but no need to shut down */
  UNEXPECTED = uid(),
  /** some classes not extending Error are thrown */
  UNKNOWN = uid(),
  /** some errors thrown by others' packages not dealt */
  OTHERS = uid()
}


export class MyError<T extends Code> extends Error {
  code: T
  constructor (code: T, message: string) {
    super(message)
    this.name = 'MyError'
    this.code = code
  }

  static fromError (e: Error) {
    return new MyError(MyErrorCode.OTHERS, e.message)
  }

  static fromAny (e: any) {
    return new MyError(MyErrorCode.UNKNOWN, String(e))
  }

  static unexpected (...toLog: any[]) {
    fail(...toLog)
    return new MyError(MyErrorCode.UNEXPECTED, 'Unexpected error.')
  }

  static fatal (...toLog: any): never {
    fail(...toLog)
    throw new MyError(MyErrorCode.FATAL, 'Fatal error.')
  }

  static async try<T, C extends Code, E extends MyError<C>> (
    fn: () => Promise<Result<T, E>>
  ) {
    try {
      return await fn()
    } catch (e: any) {
      if (e instanceof Error) return Err(MyError.fromError(e))
      else return Err(MyError.fromAny(e))
    }
  }
}

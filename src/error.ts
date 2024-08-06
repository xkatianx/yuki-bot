import { ToLog, fail } from "./misc/cli.js";
import { Ok, Err, Result, asResult } from "./misc/result.js";

const counter = { val: -1 };
export type Code = number;

export function uid(): Code {
  return counter.val--;
}

export enum MyErrorCode {
  /** unexpected error. better shut down the program in case */
  FATAL = uid(),
  /** unexpected error. but no need to shut down */
  UNEXPECTED = uid(),
  /** some classes not extending Error are thrown */
  UNKNOWN = uid(),
  /** some errors thrown by others' packages not dealt */
  OTHERS = uid(),
}

export class MyError<T extends Code> extends Error {
  code: T;
  constructor(code: T, message: string) {
    super(message);
    this.name = "MyError";
    this.code = code;
  }

  static fromError(e: Error) {
    fail(e);
    return new MyError(MyErrorCode.OTHERS, e.message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromAny(e: any) {
    fail(e);
    return new MyError(MyErrorCode.UNKNOWN, String(e));
  }

  static unexpected(...toLog: ToLog) {
    fail(...toLog);
    return new MyError(MyErrorCode.UNEXPECTED, "Unexpected error.");
  }

  static fatal(...toLog: ToLog): never {
    fail(...toLog);
    throw new MyError(MyErrorCode.FATAL, "Fatal error.");
  }

  static async try<T>(
    fn: () => Promise<Ok<T>>
  ): Promise<Result<T, MyError<MyErrorCode.OTHERS | MyErrorCode.UNKNOWN>>>;
  static async try<E extends MyError<Code>>(
    fn: () => Promise<Err<E>>
  ): Promise<
    Result<never, E | MyError<MyErrorCode.OTHERS | MyErrorCode.UNKNOWN>>
  >;
  static async try<T, E extends MyError<Code>>(
    fn: () => Promise<Result<T, E>>
  ): Promise<Result<T, E | MyError<MyErrorCode.OTHERS | MyErrorCode.UNKNOWN>>>;
  static async try<T, E extends MyError<Code>>(
    fn: () => Promise<Result<T, E>>
  ) {
    return asResult(
      await (async () => {
        try {
          return await fn();
        } catch (e: unknown) {
          if (e instanceof Error) return Err(MyError.fromError(e));
          else return Err(MyError.fromAny(e));
        }
      })()
    );
  }
}
/* TODO
- maybe make all ErrorCode string
*/

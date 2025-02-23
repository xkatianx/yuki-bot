import { GaxiosError } from "gaxios";
import {
  Code,
  MyError,
  uid,
} from "~/error.js";
import { fail } from "~/misc/cli.js";
import type { Result } from "~/misc/result.js";

export enum GFolderErrorCode {
  CANNOT_WRITE = uid(),
  INVALID_URL = uid(),
  MISSING_TEXT = uid(),
  MISSING_FILE = uid(),
  MISSING_FOLDER = uid(),
  MISSING_SPREADSHEET = uid(),
  MANY_FOLDERS = uid(),
  MANY_SPREADSHEETS = uid(),
  UNKNOWN = uid(),
}

export class GFolderError<T extends Code> extends MyError<T> {
  override readonly name = "GFolderError" as const;

  protected constructor(code: T, message: string) {
    super(code, message);
  }

  static new<T extends GFolderErrorCode>(
    code: T,
    message: string,
  ): GFolderError<T> {
    return new GFolderError(code, message);
  }

  static fromError(error: Error) {
    const message = error.message;
    if (error instanceof GaxiosError) {
      if (message.startsWith("File not found:")) {
        return new GFolderError(GFolderErrorCode.MISSING_FILE, message);
      }
    }
    fail(error);
    return new GFolderError(GFolderErrorCode.UNKNOWN, message);
  }

  static async try<T, E extends MyError<Code>>(
    fn: () => Promise<Result<T, E>>,
  ): Promise<
    Result<
      T,
      E | ReturnType<typeof this.fromError> | ReturnType<typeof this.fromAny>
    >
  > {
    return await super.try(fn);
  }
}

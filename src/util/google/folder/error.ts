import { GaxiosError } from "gaxios"
import { fail } from "~misc/cli.js"
import { MyError, MyErrorBase } from "~util/error/index.js"

export enum GFolderErrorCode {
  CANNOT_WRITE,
  INVALID_URL,
  CREATION_FAILED,
  MISSING_TEXT,
  MISSING_FILE,
  MISSING_FOLDER,
  MISSING_SPREADSHEET,
  MANY_FOLDERS,
  MANY_SPREADSHEETS,
  UNKNOWN,
}

export class GFolderError<T extends GFolderErrorCode> extends MyErrorBase<T> {
  constructor(code: T, message: string) {
    super(code, message)
    this.name = "GFolderError"
  }

  static new<T extends GFolderErrorCode>(
    code: T,
    message: string
  ): GFolderError<T> {
    return new GFolderError(code, message)
  }

  static override fromError(error: Error) {
    const message = error.message
    if (error instanceof GaxiosError) {
      if (message.startsWith("File not found:")) {
        return new GFolderError(GFolderErrorCode.MISSING_FILE, message)
      }
    }
    fail(error)
    // Fall back to base error when we can't handle it
    return MyError.fromError(error)
  }

  static override fromAny(e: unknown) {
    return MyError.fromAny(e)
  }
}

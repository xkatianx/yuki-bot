import { TypedError, UnexpectedError } from "always-panic"
import { GaxiosError } from "gaxios"
import { fail } from "~misc/cli.js"
import { isServerError } from "../misc.js"

export enum GSheetErrorCode {
  NO_FILE_ACCESS,
  CANNOT_WRITE,
  INVALID_URL,
  NO_CONTENTS,
  DUPLICATE_SHEET,
  UNKNOWN,
  FORGOT_TO_FLUSH,
  /** Google returned a 5xx; transient, so the user can retry. */
  SERVER_ERROR,
}

export class GSheetError<T extends GSheetErrorCode> extends TypedError<T> {
  static override fromAny(e: unknown) {
    if (e instanceof Error) {
      const message = e.message
      if (e instanceof GaxiosError) {
        if (message.startsWith("File not found:")) {
          return new GSheetError(GSheetErrorCode.NO_FILE_ACCESS, message)
        } else if (message.startsWith("Invalid requests[0].duplicateSheet:")) {
          return new GSheetError(GSheetErrorCode.DUPLICATE_SHEET, message)
        } else if (isServerError(e)) {
          return new GSheetError(GSheetErrorCode.SERVER_ERROR, message, {
            cause: e,
          })
        }
      }
      fail(e)
    }
    return UnexpectedError.fromAny(e)
  }
}

export enum PuzzleSheetErrorCode {
  MISSING_TEMPLATE,
  placeholder,
}

export class PuzzleSheetError<
  T extends PuzzleSheetErrorCode,
> extends TypedError<T> {}

export enum SettingSheetErrorCode {
  UNKNOWN_VERSION,
  placeholder,
}

export class SettingSheetError<
  T extends SettingSheetErrorCode,
> extends TypedError<T> {}

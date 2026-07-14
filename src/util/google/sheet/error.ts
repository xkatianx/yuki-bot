import { TypedError, UnexpectedError } from "always-panic"
import { GaxiosError } from "gaxios"
import { fail } from "~misc/cli.js"

export enum GSheetErrorCode {
  NO_FILE_ACCESS,
  CANNOT_WRITE,
  INVALID_URL,
  NO_CONTENTS,
  DUPLICATE_SHEET,
  UNKNOWN,
  FORGOT_TO_FLUSH,
}

export class GSheetError<T extends GSheetErrorCode> extends TypedError<T> {
  constructor(code: T, message: string) {
    super(code, message)
    this.name = "GSheetError"
  }

  static new<T extends GSheetErrorCode>(
    code: T,
    message: string
  ): GSheetError<T> {
    return new GSheetError(code, message)
  }

  static override fromAny(e: unknown) {
    if (e instanceof Error) {
      const message = e.message
      if (e instanceof GaxiosError) {
        if (message.startsWith("File not found:")) {
          return GSheetError.new(GSheetErrorCode.NO_FILE_ACCESS, message)
        } else if (message.startsWith("Invalid requests[0].duplicateSheet:")) {
          return GSheetError.new(GSheetErrorCode.DUPLICATE_SHEET, message)
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
> extends TypedError<T> {
  constructor(code: T, message: string) {
    super(code, message)
    this.name = "PuzzleSheetError"
  }

  static new<T extends PuzzleSheetErrorCode>(
    code: T,
    message: string
  ): PuzzleSheetError<T> {
    return new PuzzleSheetError(code, message)
  }
}

export enum SettingSheetErrorCode {
  UNKNOWN_VERSION,
  placeholder,
}

export class SettingSheetError<
  T extends SettingSheetErrorCode,
> extends TypedError<T> {
  constructor(code: T, message: string) {
    super(code, message)
    this.name = "SettingSheetError"
  }

  static new<T extends SettingSheetErrorCode>(
    code: T,
    message: string
  ): SettingSheetError<T> {
    return new SettingSheetError(code, message)
  }
}

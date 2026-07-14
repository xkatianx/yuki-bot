import { TypedError, UnexpectedError } from "always-panic"
import { GaxiosError } from "gaxios"
import { fail } from "~misc/cli.js"

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

type GFolderErrorInfo<T extends GFolderErrorCode> =
  T extends GFolderErrorCode.INVALID_URL
    ? {
        /** The input URL */
        url: string
      }
    : T extends GFolderErrorCode.CANNOT_WRITE
      ? {
          /** The ID of the folder */
          folderId: string
        }
      : undefined

export class GFolderError<T extends GFolderErrorCode> extends TypedError<T> {
  override info: GFolderErrorInfo<T>

  constructor(code: T, message: string, info: GFolderErrorInfo<T>) {
    super(code, message, info)
    this.name = "GFolderError"
    this.info = info
  }

  static new<T extends GFolderErrorCode>(
    code: GFolderErrorInfo<T> extends undefined ? T : never,
    message: string,
    info?: GFolderErrorInfo<T>
  ): GFolderError<T>
  static new<T extends GFolderErrorCode>(
    code: T,
    message: string,
    info: GFolderErrorInfo<T>
  ): GFolderError<T>
  static new<T extends GFolderErrorCode>(
    code: T,
    message: string,
    info: GFolderErrorInfo<T>
  ): GFolderError<T> {
    return new GFolderError(code, message, info)
  }

  static override fromAny(e: unknown) {
    if (e instanceof Error) {
      const message = e.message
      if (e instanceof GaxiosError) {
        if (message.startsWith("File not found:")) {
          return GFolderError.new(GFolderErrorCode.MISSING_FILE, message)
        }
      }
      fail(e)
    }
    return UnexpectedError.fromAny(e)
  }
}

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

type GFolderErrorInfoMap = {
  [GFolderErrorCode.CANNOT_WRITE]: {
    /** The ID of the folder */
    folderId: string
  }
  [GFolderErrorCode.INVALID_URL]: {
    /** The input URL */
    url: string
  }
  [GFolderErrorCode.CREATION_FAILED]: undefined
  [GFolderErrorCode.MISSING_TEXT]: undefined
  [GFolderErrorCode.MISSING_FILE]: undefined
  [GFolderErrorCode.MISSING_FOLDER]: undefined
  [GFolderErrorCode.MISSING_SPREADSHEET]: undefined
  [GFolderErrorCode.MANY_FOLDERS]: undefined
  [GFolderErrorCode.MANY_SPREADSHEETS]: undefined
  [GFolderErrorCode.UNKNOWN]: undefined
}

export type GFolderErrorInfo<C extends GFolderErrorCode> =
  GFolderErrorInfoMap[C]

export class GFolderError<T extends GFolderErrorCode> extends TypedError<T> {
  declare info: GFolderErrorInfo<T>

  constructor(
    code: T,
    message: string,
    ...[info]: undefined extends GFolderErrorInfo<T>
      ? [info?: GFolderErrorInfo<T>]
      : [info: GFolderErrorInfo<T>]
  ) {
    super(code, message, info)
    this.name = "GFolderError"
  }

  static override fromAny(e: unknown) {
    if (e instanceof Error) {
      const message = e.message
      if (e instanceof GaxiosError) {
        if (message.startsWith("File not found:")) {
          return new GFolderError(GFolderErrorCode.MISSING_FILE, message)
        }
      }
      fail(e)
    }
    return UnexpectedError.fromAny(e)
  }
}

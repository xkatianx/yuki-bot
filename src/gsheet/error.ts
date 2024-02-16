import { Code, MyError, uid } from '../error.js'

export enum GDriveErrorCode {
  CANNOT_WRITE = uid(),
  INVALID_URL = uid(),
  MISSING_TEXT = uid(),
  MISSING_FILE = uid(),
  MISSING_FOLDER = uid()
}

export class GDriveError<T extends Code> extends MyError<T> {
  private constructor (code: T, message: string) {
    super(code, message)
    this.name = 'GDriveError'
  }

  static new<T extends GDriveErrorCode> (
    code: T,
    message: string
  ): GDriveError<T> {
    return new GDriveError(code, message)
  }
}

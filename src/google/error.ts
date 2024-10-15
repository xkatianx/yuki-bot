import { Code, MyError, uid } from "../error.js";

export enum GDriveErrorCode {
  CANNOT_WRITE = uid(),
  INVALID_URL = uid(),
  MISSING_TEXT = uid(),
  MISSING_FILE = uid(),
  MISSING_FOLDER = uid(),
}

export class GDriveError<T extends Code> extends MyError<T> {
  private constructor(code: T, message: string) {
    super(code, message);
    this.name = "GDriveError";
  }

  static new<T extends GDriveErrorCode>(
    code: T,
    message: string
  ): GDriveError<T> {
    return new GDriveError(code, message);
  }
}

export enum GSpreadsheetErrorCode {
  CANNOT_WRITE = uid(),
}

export class GSpreadsheetError<T extends Code> extends MyError<T> {
  private constructor(code: T, message: string) {
    super(code, message);
    this.name = "GSpreadsheetError";
  }

  static new<T extends GSpreadsheetErrorCode>(
    code: T,
    message: string
  ): GSpreadsheetError<T> {
    return new GSpreadsheetError(code, message);
  }
}

export enum SettingSheetErrorCode {
  UNKNOWN_VERSION = uid(),
}

export class SettingSheetError<T extends Code> extends MyError<T> {
  private constructor(code: T, message: string) {
    super(code, message);
    this.name = "SettingSheetError";
  }

  static new<T extends SettingSheetErrorCode>(
    code: T,
    message: string
  ): SettingSheetError<T> {
    return new SettingSheetError(code, message);
  }
}

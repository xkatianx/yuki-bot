import { GaxiosError } from "gaxios";
import {
  Code,
  MyError,
  uid,
} from "~/error.js";
import { fail } from "~/misc/cli.js";

export enum GSpreadsheetErrorCode {
  CANNOT_WRITE = uid(),
  INVALID_URL = uid(),
  UNKNOWN = uid(),
}

export class GSpreadsheetError<T extends Code> extends MyError<T> {
  private constructor(code: T, message: string) {
    super(code, message);
    this.name = "GSpreadsheetError";
  }

  static new<T extends GSpreadsheetErrorCode>(
    code: T,
    message: string,
  ): GSpreadsheetError<T> {
    return new GSpreadsheetError(code, message);
  }

  static fromError(error: Error) {
    const message = error.message;
    if (error instanceof GaxiosError) {
      if (message.startsWith("File not found:")) {
        return new GSpreadsheetError(
          GSpreadsheetErrorCode.CANNOT_WRITE,
          message,
        );
      }
    }
    fail(error);
    return new GSpreadsheetError(GSpreadsheetErrorCode.UNKNOWN, message);
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
    message: string,
  ): SettingSheetError<T> {
    return new SettingSheetError(code, message);
  }
}

/*
  code: 400,
  errors: [
    {
      message: 'Invalid requests[0].duplicateSheet: A sheet with the name "The Annual Massachusetts Spelling Bee" already exists. Please enter another name.',
      domain: 'global',
      reason: 'badRequest'
    }
  ]
*/

import { MyError } from "../error.js";
import { GDriveErrorCode } from "../google/error.js";
import { fail } from "../misc/cli.js";
import { env } from "../misc/env.js";
import { SettingsErrorCode } from "./yuki/settings.js";

/** Error Level */
export enum ELV {
  /** just for debug */
  LOG,
  /** some error messages show to discord */
  SAY,
  /** should not happen */
  BAD,
}

export class YukiError extends Error {
  level: ELV;
  constructor(level: ELV, message: string) {
    super();
    this.name = "YukiError";
    this.level = level;
    this.message = message;
  }
}

export function say(e: string | MyError<number>): never {
  let message = "";
  if (e instanceof MyError) {
    switch (e.code) {
      case SettingsErrorCode.MISSING_CHANNEL:
        message = `Please use \`/new <url>\` first it this channel.`;
        break;
      case GDriveErrorCode.CANNOT_WRITE:
        message = `${e.message}\nPlease add \`${env.GG.EMAIL}\` as an editor.`;
        break;
      default:
        fail(e);
        message = e.message;
    }
  } else message = e;
  throw new YukiError(ELV.SAY, message);
}

export function bad(message: string | MyError<number>): never {
  fail(message);
  if (message instanceof MyError) {
    throw new YukiError(ELV.BAD, message.message);
  }
  throw new YukiError(ELV.BAD, message);
}

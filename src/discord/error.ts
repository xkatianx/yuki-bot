import { GFolderErrorCode } from "~/google/folder/error.js";

import { MyError } from "../error.js";
import { fail } from "../misc/cli.js";
import { env } from "../misc/env.js";
import { SettingsErrorCode } from "./yuki/settings.js";

/** Error Level */
export enum ELV {
  /** just for debug */
  LOG,
  /** some error messages show to discord but ephemeral */
  PSS,
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

function errorMessage(e: MyError<number>) {
  switch (e.code) {
    case SettingsErrorCode.MISSING_CHANNEL:
      return `Please use \`/new <url>\` first it this channel.`;
    case GFolderErrorCode.CANNOT_WRITE:
      return `${e.message}\nPlease add \`${env.GG.EMAIL}\` as an editor.`;
    default:
      fail(e);
      return e.message;
  }
}

export function pss(e: string | MyError<number>): never {
  const message = e instanceof MyError ? errorMessage(e) : e;
  throw new YukiError(ELV.PSS, message);
}

export function say(e: string | MyError<number>): never {
  const message = e instanceof MyError ? errorMessage(e) : e;
  throw new YukiError(ELV.SAY, message);
}

export function bad(message: string | MyError<number>): never {
  fail(message);
  if (message instanceof MyError) {
    throw new YukiError(ELV.BAD, message.message);
  }
  throw new YukiError(ELV.BAD, message);
}

import { MyErrorBase } from "~util/error"

export enum BotErrorCode {
  INVALID_LOG_CHANNEL,
  UNKNOWN_COMMAND,
  UNKNOWN_BUTTON,
  UNKNOWN_MODAL,
  UNKNOWN_SELECT_MENU,
}

export class BotError<T extends BotErrorCode> extends MyErrorBase<T> {
  private constructor(code: T, message: string) {
    super(code, message)
    this.name = "BotError"
  }

  static new<T extends BotErrorCode>(code: T, message: string): BotError<T> {
    return new BotError(code, message)
  }
}

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
export class BotLogError extends Error {
  level: ELV
  constructor(level: ELV, message: string) {
    super(message)
    this.name = "BotLogError"
    this.level = level
  }
}

import { TypedError, UnexpectedError } from "always-panic"
import { DiscordAPIError } from "discord.js"

export enum DiscordErrorCode {
  NO_ACCESS,
  NO_ACCESS_FETCH_PINS,
  NO_PERMISSION,
  UNKNOWN,
}

export class DiscordError<T extends DiscordErrorCode> extends TypedError<T> {
  constructor(code: T, message: string, cause?: unknown) {
    super(code, message)
    this.name = "DiscordError"
    if (cause != null) this.cause = cause
  }

  static new<T extends DiscordErrorCode>(
    code: T,
    message: string,
    cause?: unknown
  ): DiscordError<T> {
    return new DiscordError(code, message, cause)
  }

  static override fromAny(e: unknown) {
    if (e instanceof Error) {
      const message = e.message
      if (e instanceof DiscordAPIError) {
        if (message === "Missing Permissions") {
          return new DiscordError(DiscordErrorCode.NO_PERMISSION, message, e)
        }
        if (message === "Missing Access") {
          return new DiscordError(DiscordErrorCode.NO_ACCESS, message, e)
        }
      }
    }
    return UnexpectedError.fromAny(e)
  }
}

export enum BotErrorCode {
  INVALID_LOG_CHANNEL,
  UNKNOWN_COMMAND,
  UNKNOWN_BUTTON,
  UNKNOWN_MODAL,
  UNKNOWN_SELECT_MENU,
}

export class BotError<T extends BotErrorCode> extends TypedError<T> {
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

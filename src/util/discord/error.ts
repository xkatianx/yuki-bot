import { TypedError, UnexpectedError } from "always-panic"
import { DiscordAPIError } from "discord.js"

export enum DiscordErrorCode {
  NO_ACCESS,
  NO_ACCESS_FETCH_PINS,
  NO_PERMISSION,
}

type DiscordErrorInfoMap = {
  [DiscordErrorCode.NO_ACCESS]: { cause: Error }
  [DiscordErrorCode.NO_ACCESS_FETCH_PINS]: { cause: Error }
  [DiscordErrorCode.NO_PERMISSION]: { cause: Error }
}

export type DiscordErrorInfo<C extends DiscordErrorCode> =
  DiscordErrorInfoMap[C]

export class DiscordError<T extends DiscordErrorCode> extends TypedError<T> {
  declare info: DiscordErrorInfo<T>

  constructor(code: T, message: string, info: DiscordErrorInfo<T>) {
    super(code, message, info)
    this.name = "DiscordError"
  }

  static noAccessFetchPins(error: Error) {
    return new DiscordError(
      DiscordErrorCode.NO_ACCESS_FETCH_PINS,
      "Missing permissions to fetch pinned messages in a certain channel.",
      { cause: error }
    )
  }

  static override fromAny(e: unknown) {
    if (e instanceof Error) {
      const message = e.message
      if (e instanceof DiscordAPIError) {
        if (message === "Missing Permissions") {
          return new DiscordError(DiscordErrorCode.NO_PERMISSION, message, {
            cause: e,
          })
        }
        if (message === "Missing Access") {
          return new DiscordError(DiscordErrorCode.NO_ACCESS, message, {
            cause: e,
          })
        }
      }
    }
    return UnexpectedError.fromAny(e)
  }
}

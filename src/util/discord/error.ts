import { TypedError, UnexpectedError } from "always-panic"
import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js"

export enum DiscordErrorCode {
  NO_ACCESS,
  NO_ACCESS_FETCH_PINS,
  NO_PERMISSION,
  LOGIN_FAILED,
  /**
   * An interaction token is no longer usable — typically the 15-minute limit
   * on an interaction a handler still refers to. Retrying won't help.
   */
  EXPIRED_TOKEN,
}

type DiscordErrorInfoMap = {
  [DiscordErrorCode.NO_ACCESS]: { cause: Error }
  [DiscordErrorCode.NO_ACCESS_FETCH_PINS]: { cause: Error }
  [DiscordErrorCode.NO_PERMISSION]: { cause: Error }
  [DiscordErrorCode.LOGIN_FAILED]: { cause: Error }
  [DiscordErrorCode.EXPIRED_TOKEN]: { cause: Error }
}

export class DiscordError<T extends DiscordErrorCode> extends TypedError<
  T,
  DiscordErrorInfoMap
> {
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
        if (
          e.code === RESTJSONErrorCodes.InvalidWebhookToken ||
          e.code === RESTJSONErrorCodes.UnknownInteraction
        ) {
          return new DiscordError(DiscordErrorCode.EXPIRED_TOKEN, message, {
            cause: e,
          })
        }
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

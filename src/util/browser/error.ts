import { TypedError, UnexpectedError } from "always-panic"
import { TimeoutError } from "puppeteer"

export enum BrowserErrorCode {
  INVALID_URL,
  INVALID_SCREENSHOT_FILENAME,
  TIMEOUT,
  ABORTED,
  LAUNCH_ERROR,
}

type BrowserErrorInfoMap = {
  [BrowserErrorCode.INVALID_URL]: undefined
  [BrowserErrorCode.INVALID_SCREENSHOT_FILENAME]: undefined
  [BrowserErrorCode.TIMEOUT]: undefined
  [BrowserErrorCode.ABORTED]: undefined
  /** Keeps the original error until it is properly converted to a typed error. */
  [BrowserErrorCode.LAUNCH_ERROR]: { error: unknown }
}

export class BrowserError<T extends BrowserErrorCode> extends TypedError<
  T,
  BrowserErrorInfoMap
> {
  static override fromAny(e: unknown) {
    return UnexpectedError.fromAny(e)
  }
}

/**
 * Recognize the puppeteer navigation failures we know how to type.
 * Anything else is a bug in the chain and stays an `UnexpectedError`.
 */
export function toNavigationError(e: unknown) {
  if (e instanceof Error) {
    const message = e.message
    if (
      e instanceof TimeoutError ||
      message.startsWith("net::ERR_CONNECTION_TIMED_OUT ")
    )
      return new BrowserError(BrowserErrorCode.TIMEOUT, message)
    if (
      message.startsWith("net::ERR_NAME_NOT_RESOLVED ") ||
      message.startsWith(
        "Protocol error (Page.navigate): Cannot navigate to invalid URL"
      )
    )
      return new BrowserError(BrowserErrorCode.INVALID_URL, message)
    if (message.startsWith("net::ERR_ABORTED "))
      return new BrowserError(BrowserErrorCode.ABORTED, message)
  }
  return UnexpectedError.fromAny(e)
}

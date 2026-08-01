import {
  AsyncResult,
  err,
  ok,
  result,
  TypedError,
  UnexpectedError,
  UnexpectedErrorCode,
} from "always-panic"
import puppeteer, { type Browser, type Page, TimeoutError } from "puppeteer"
import { info } from "~misc/cli.js"
import { env } from "~misc/env.js"

class MyBrowser implements AsyncDisposable {
  TIMEOUT_SECONDS = 12

  /**
   * Create a new MyBrowser instance.
   * @param browser - The underlying puppeteer browser.
   */
  constructor(public readonly browser: Browser) {}

  /**
   * Parse a URL string into a URL object.
   * @param url - The URL string to parse.
   * @returns A URL object.
   */
  static parseUrl(url: string) {
    try {
      return ok(new URL(url))
    } catch {
      return err(
        BrowserError.new(BrowserErrorCode.INVALID_URL, `Invalid URL: ${url}`)
      )
    }
  }

  // The signature is for YukiBrowser to extend
  /**
   * Create a new MyBrowser instance.
   * @param _url - The main URL for this browser.
   * @returns A MyBrowser instance.
   */
  static new(
    _url?: string
  ): AsyncResult<MyBrowser, BrowserError<BrowserErrorCode>> {
    return result.panic(
      BrowserError.try(async () => {
        const args = env.puppeteerLaunchArgs?.split(" ") ?? []
        const b = await puppeteer.launch({
          pipe: false,
          args,
        })
        return ok(new MyBrowser(b))
      })
    )
  }

  /**
   * Dispose the browser.
   */
  async [Symbol.asyncDispose]() {
    try {
      await this.browser.close()
    } catch {
      // TODO: maybe do something here
    }
  }

  /**
   * Listen to the WebSocket for the given page.
   * TODO: verify if this works
   * @param page - The page to listen to.
   */
  protected async listenWS(page: Page) {
    const session = await page.createCDPSession()
    await session.send("Network.enable")
    session.on("Network.webSocketFrameReceived", (event) => {
      info(event.response.payloadData)
    })
  }

  /**
   * Get the "second" page or create a new one if it doesn't exist.
   * @returns The second page.
   */
  protected getPage() {
    return result.panic(
      BrowserError.try(async () => {
        const pages = await this.browser.pages()
        let page = pages[1]
        if (page == null) {
          page = await this.browser.newPage()
          page.setDefaultTimeout(this.TIMEOUT_SECONDS * 1000)
          page.setDefaultNavigationTimeout(this.TIMEOUT_SECONDS * 1000)
          await page.setViewport({ width: 1280, height: 1024 })
          await this.listenWS(page)
        }
        return ok(page)
      })
    )
  }

  /**
   * Browse to the given URL.
   * @param url - The URL to browse to.
   * @returns The HTTP response.
   */
  browse(url: string) {
    return result.panic(
      AsyncResult.merge([
        AsyncResult.from(MyBrowser.parseUrl(url)),
        this.getPage(),
      ]).andThen(([url, page]) =>
        BrowserError.try(async () => {
          const r = await page.goto(url.href, {
            waitUntil: ["load"],
          })
          // Paradox Puzzlehunt uses an SSE/EventSource stream opening forever,
          // so full network idle may never happen
          await page
            .waitForNetworkIdle({
              idleTime: 500,
              timeout: 3000,
              concurrency: 1,
            })
            .catch(() => {})
          return ok(r)
        }).orElse((e) => {
          if (
            e instanceof UnexpectedError &&
            e.code === UnexpectedErrorCode.UNKNOWN
          ) {
            return err(toNavigationError(e.cause))
          }
          return err(e)
        })
      )
    )
  }

  /**
   * Get the URL of the current page.
   * @returns The URL of the current page.
   */
  getUrl() {
    return result.panic(
      this.getPage().andThen((page) => BrowserError.try(() => ok(page.url())))
    )
  }

  /**
   * Get the title of the current page.
   * This will wait for the title to change after page load for 2 seconds.
   * @returns The title of the current page.
   */
  getTitle() {
    return result.panic(
      this.getPage().andThen(async (page) =>
        BrowserError.try(async () => {
          // Wait for the title to change after page load for 2 seconds
          const initialTitle = await page.evaluate(() => document.title)
          try {
            await page.waitForFunction(
              (oldTitle) => document.title !== oldTitle,
              { timeout: 2000 },
              initialTitle
            )
          } catch {
            // ignore
          }
          const newTitle = await page.evaluate(() => document.title)
          return ok(newTitle)
        })
      )
    )
  }

  /**
   * Take a screenshot of the current page.
   * @param filename - The filename of the screenshot.
   * It must match the pattern `[a-zA-Z0-9_-]+\.(png|jpeg|webp)`.
   * @returns the buffer of the screenshot.
   */
  async screenshot(
    filename: `${string}.png` | `${string}.jpeg` | `${string}.webp` = "test.png"
  ) {
    if (!/^[a-zA-Z0-9_-]+\.(png|jpeg|webp)$/.exec(filename))
      return err(
        BrowserError.new(BrowserErrorCode.INVALID_SCREENSHOT_FILENAME, filename)
      )
    return result.panic(
      this.getPage().andThen(async (page) =>
        BrowserError.try(async () =>
          ok(
            await page.screenshot({
              path: `screenshots/${filename}`,
              fullPage: true,
            })
          )
        )
      )
    )
  }
}

export default MyBrowser

export enum BrowserErrorCode {
  INVALID_URL,
  INVALID_SCREENSHOT_FILENAME,
  TIMEOUT,
  ABORTED,
}

export class BrowserError<T extends BrowserErrorCode> extends TypedError<T> {
  constructor(code: T, message: string) {
    super(code, message)
    this.name = "BrowserError"
  }

  static new<T extends BrowserErrorCode>(
    code: T,
    message: string
  ): BrowserError<T> {
    return new BrowserError(code, message)
  }

  static override fromAny(e: unknown) {
    return UnexpectedError.fromAny(e)
  }
}

/**
 * Recognize the puppeteer navigation failures we know how to type.
 * Anything else is a bug in the chain and stays an `UnexpectedError`.
 */
function toNavigationError(e: unknown) {
  if (e instanceof Error) {
    const message = e.message
    if (
      e instanceof TimeoutError ||
      message.startsWith("net::ERR_CONNECTION_TIMED_OUT ")
    )
      return BrowserError.new(BrowserErrorCode.TIMEOUT, message)
    if (
      message.startsWith("net::ERR_NAME_NOT_RESOLVED ") ||
      message.startsWith(
        "Protocol error (Page.navigate): Cannot navigate to invalid URL"
      )
    )
      return BrowserError.new(BrowserErrorCode.INVALID_URL, message)
    if (message.startsWith("net::ERR_ABORTED "))
      return BrowserError.new(BrowserErrorCode.ABORTED, message)
  }
  return UnexpectedError.fromAny(e)
}

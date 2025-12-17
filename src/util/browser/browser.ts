import puppeteer, { TimeoutError, type Browser, type Page } from "puppeteer"
import { info } from "~misc/cli.js"
import type { Code } from "~util/error/index.js"
import { MyError, MyErrorBase } from "~util/error/index.js"
import { AsyncResult, err, ok, result } from "~util/result/index.js"

class MyBrowser implements AsyncDisposable {
  TIMEOUT_SECONDS = 12
  constructor(public readonly browser: Browser) {}

  /**
   * Parse a URL string into a URL object.
   * @param url - The URL string to parse.
   * @returns A Result containing the parsed URL or an error.
   * @throws panic
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
  static new(_url?: string): AsyncResult<MyBrowser, MyError<Code>> {
    return MyError.try(async () => {
      const b = await puppeteer.launch()
      return ok(new MyBrowser(b))
    })
  }

  async [Symbol.asyncDispose]() {
    await this.browser.close()
  }

  async listenWS(page: Page) {
    const session = await page.createCDPSession()
    await session.send("Network.enable")
    session.on("Network.webSocketFrameReceived", (event) => {
      info(event.response.payloadData)
    })
  }

  protected getPage() {
    return MyError.try(async () => {
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
  }

  private async _browse(url: URL, page: Page) {
    try {
      const res = await page.goto(url.href, {
        waitUntil: ["domcontentloaded", "networkidle0"],
      })
      return ok(res)
    } catch (e) {
      if (!(e instanceof Error)) throw e
      if (
        e instanceof TimeoutError ||
        e.message.startsWith("net::ERR_CONNECTION_TIMED_OUT ")
      )
        return err(BrowserError.new(BrowserErrorCode.TIMEOUT, e.message))
      if (
        e.message.startsWith("net::ERR_NAME_NOT_RESOLVED ") ||
        e.message.startsWith(
          "Protocol error (Page.navigate): Cannot navigate to invalid URL"
        )
      )
        return err(BrowserError.new(BrowserErrorCode.INVALID_URL, e.message))
      if (e.message.startsWith("net::ERR_ABORTED "))
        return err(BrowserError.new(BrowserErrorCode.ABORTED, e.message))
      throw e
    }
  }

  browse(url: string) {
    return AsyncResult.merge([
      AsyncResult.from(
        result
          .parseUrl(url)
          .mapErr((e) =>
            BrowserError.new(BrowserErrorCode.INVALID_URL, e.message)
          )
      ),
      this.getPage(),
    ]).andThen(([url, page]) =>
      MyError.try(async () => AsyncResult.from(this._browse(url, page)))
    )
  }

  getUrl() {
    return this.getPage().andThen(async (page) =>
      MyError.try(() => ok(page.url()))
    )
  }

  getTitle() {
    return this.getPage().andThen(async (page) =>
      MyError.try(async () => {
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
  }

  /**
   * Take a screenshot of the current page.
   * @param filename - The filename of the screenshot.
   * It must match the pattern `[a-zA-Z0-9_-]+\.(png|jpeg|webp)`.
   * @returns the buffer of the screenshot.
   * @throws panic
   */
  async screenshot(
    filename: `${string}.png` | `${string}.jpeg` | `${string}.webp` = "test.png"
  ) {
    if (!/^[a-zA-Z0-9_-]+\.(png|jpeg|webp)$/.exec(filename))
      return err(
        BrowserError.new(BrowserErrorCode.INVALID_SCREENSHOT_FILENAME, filename)
      )
    return this.getPage().andThen(async (page) =>
      MyError.try(async () =>
        ok(
          await page.screenshot({
            path: `screenshots/${filename}`,
            fullPage: true,
          })
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

export class BrowserError<T extends BrowserErrorCode> extends MyErrorBase<T> {
  private constructor(code: T, message: string) {
    super(code, message)
    this.name = "BrowserError"
  }

  static new<T extends BrowserErrorCode>(
    code: T,
    message: string
  ): BrowserError<T> {
    return new BrowserError(code, message)
  }
}

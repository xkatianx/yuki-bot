import {
  AsyncResult,
  err,
  ok,
  result,
  UnexpectedError,
  UnexpectedErrorCode,
} from "always-panic"
import puppeteer, { type BrowserContext, type Page } from "puppeteer"
import { info } from "~misc/cli.js"
import { env } from "~misc/env.js"
import { BrowserError, BrowserErrorCode, toNavigationError } from "./error.js"

/**
 * The single shared Chrome process. Each MyBrowser instance owns an isolated
 * {@link BrowserContext} inside it (separate cookies/storage per channel),
 * so only one memory-heavy browser process exists no matter how many
 * channels are active.
 */
let sharedBrowser: ReturnType<typeof launchSharedBrowser> | null = null

function launchSharedBrowser() {
  const args = env.puppeteerLaunchArgs?.split(" ") ?? []
  return BrowserError.try(async () =>
    ok(await puppeteer.launch({ pipe: false, args }))
  ).mapErr(
    (e) =>
      new BrowserError(
        BrowserErrorCode.LAUNCH_ERROR,
        "An error happens while launching the browser",
        { error: e.cause }
      )
  )
}

/**
 * Get the shared browser, launching it on first use and relaunching it if
 * Chrome died (e.g. OOM-killed). Concurrent callers share one launch attempt;
 * a failed launch surfaces as a `LAUNCH_ERROR` and is not cached, so the
 * next caller retries.
 */
function getSharedBrowser() {
  return AsyncResult.from(async () => {
    for (;;) {
      sharedBrowser ??= launchSharedBrowser()
      const pending = sharedBrowser
      const res = await pending
      if (res.isErr()) {
        // Do not cache a failed launch; the next caller retries.
        if (sharedBrowser === pending) sharedBrowser = null
        return res
      }
      if (res.value.connected) return res
      // Only the first caller to observe the dead browser relaunches; the
      // rest loop into the fresh `sharedBrowser`.
      if (sharedBrowser === pending) sharedBrowser = launchSharedBrowser()
    }
  })
}

class MyBrowser implements AsyncDisposable {
  TIMEOUT_SECONDS = 12

  /**
   * Create a new MyBrowser instance.
   * @param context - This instance's isolated context in the shared browser.
   */
  constructor(public readonly context: BrowserContext) {}

  /** Whether this instance can still drive its Chrome context. */
  get connected() {
    return !this.context.closed && this.context.browser().connected
  }

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
        new BrowserError(BrowserErrorCode.INVALID_URL, `Invalid URL: ${url}`)
      )
    }
  }

  /**
   * Create a fresh isolated context in the shared browser,
   * launching (or relaunching) the browser if needed.
   * @returns A new BrowserContext.
   */
  protected static newContext() {
    return getSharedBrowser().map((browser) => browser.createBrowserContext())
  }

  /**
   * Create a new MyBrowser instance.
   * @param url - The main URL for this browser, validated when given.
   * (Validating here keeps this error union identical to YukiBrowser.new's,
   * which the static override requires.)
   * @returns A MyBrowser instance.
   */
  static new(url?: string) {
    return result.panic(
      result.gen(async function* () {
        if (url != null) yield* MyBrowser.parseUrl(url)
        const context = yield* MyBrowser.newContext()
        return ok(new MyBrowser(context))
      })
    )
  }

  /**
   * Dispose this instance's context (and all its pages).
   * The shared browser stays alive for other instances.
   */
  async [Symbol.asyncDispose]() {
    try {
      await this.context.close()
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
   * Get this context's page or create a new one if it doesn't exist.
   * (Unlike the default context, a fresh context starts with no pages.)
   * @returns The page.
   */
  protected getPage() {
    return result.panic(
      BrowserError.try(async () => {
        const pages = await this.context.pages()
        let page = pages[0]
        if (page == null) {
          page = await this.context.newPage()
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
    const self = this
    return result.panic(
      result.gen(async function* () {
        const urlObj = yield* MyBrowser.parseUrl(url)
        const page = yield* self.getPage()
        return BrowserError.try(async () => {
          const res = await page.goto(urlObj.href, {
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
          return ok(res)
        }).orElse((e) =>
          UnexpectedError.is(e, UnexpectedErrorCode.UNKNOWN)
            ? err(toNavigationError(e.cause))
            : err(e)
        )
      })
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
        new BrowserError(BrowserErrorCode.INVALID_SCREENSHOT_FILENAME, filename)
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

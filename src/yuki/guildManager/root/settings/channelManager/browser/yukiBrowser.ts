import {
  type AsyncResult,
  err,
  ok,
  result,
  TypedError,
  UnexpectedError,
} from "always-panic"
import puppeteer, { type Browser, type Page } from "puppeteer"
import { env } from "~misc/env.js"
import MyBrowser, {
  type BrowserError,
  type BrowserErrorCode,
} from "~util/browser/browser.js"

export class YukiBrowser extends MyBrowser {
  isLogin = false

  constructor(
    public override readonly browser: Browser,
    public mainUrl: URL
  ) {
    super(browser)
  }

  /**
   * Create a new YukiBrowser instance.
   * @param url - The main URL for this browser.
   * @returns The new YukiBrowser instance.
   * @throws never
   */
  static override new(
    url: string
  ): AsyncResult<YukiBrowser, BrowserError<BrowserErrorCode>> {
    return result.panic(
      YukiBrowserError.try(async () => {
        const mainUrl = MyBrowser.parseUrl(url)
        if (mainUrl.isErr()) return mainUrl
        const args = env.puppeteerLaunchArgs?.split(" ") ?? []
        const b = await puppeteer.launch({ args })
        const browser = new YukiBrowser(b, mainUrl.value)
        return ok(browser)
      })
    )
  }

  getPuzzles() {
    const selector = 'a[href*="/puzzle/"], a[href*="/puzzles/"]'
    return result.panic(
      this.getPage().andThen(async (page) =>
        YukiBrowserError.try(async () => {
          const links = await page.$$eval(selector, (elements) =>
            elements
              .map((element) => element.href)
              .filter((v, i, a) => a.indexOf(v) === i)
          )
          return ok(links)
        })
      )
    )
  }

  /**
   * Try to login to the website with the given username, password and URL.
   * @param username - The username to login with.
   * @param password - The password to login with.
   * @param url - The URL to login to. Must be a valid URL.
   * @returns `this`.
   */
  async login(username: string, password: string, url: string) {
    username = username.trim()
    password = password.trim()
    url = url.trim()
    if (username === "")
      return err(
        YukiBrowserError.new(
          YukiBrowserErrorCode.EMPTY_USERNAME,
          "Username cannot be empty."
        )
      )
    if (password === "")
      return err(
        YukiBrowserError.new(
          YukiBrowserErrorCode.EMPTY_PASSWORD,
          "Password cannot be empty."
        )
      )
    return result.panic(
      this.browse(url)
        .andThen(async () => await this.getPage())
        .andThen(async (page) => findLoginElements(page))
        .andThen(async ({ page, usernameEl, passwordEl, submitEl }) =>
          YukiBrowserError.try(async () => {
            await usernameEl.type(username)
            await passwordEl.type(password)
            await Promise.all([page.waitForNavigation(), submitEl.click()])
            this.isLogin = true
            return ok(this)
          })
        )
    )
  }
}

function findLoginElements(page: Page) {
  return YukiBrowserError.try(async () => {
    let inputs = await page.$$(
      'input[type="text"], input[type="password"], input[name="username"]'
    )
    if (inputs.length < 2)
      inputs = await page.$$(
        'input[name="id"], input[type="email"], input[type="password"]'
      )
    const usernameEl = inputs[0]
    const passwordEl = inputs[1]
    if (usernameEl == null || passwordEl == null || inputs.length !== 2)
      return err(
        YukiBrowserError.new(
          YukiBrowserErrorCode.LOGIN_INPUT_NOT_FOUND,
          "Unable to find input boxes for login."
        )
      )

    const submits = await page.$$('button[type="submit"], input[type="submit"]')
    const submitEl = submits[0]
    if (submitEl == null || submits.length !== 1)
      return err(
        YukiBrowserError.new(
          YukiBrowserErrorCode.SUBMIT_NOT_FOUND,
          "Unable to find submit button."
        )
      )
    return ok({ page, usernameEl, passwordEl, submitEl })
  })
}

export enum YukiBrowserErrorCode {
  ALREADY_LOGIN,
  LOGIN_INPUT_NOT_FOUND,
  SUBMIT_NOT_FOUND,
  MISSING_PAGE,
  EMPTY_USERNAME,
  EMPTY_PASSWORD,
}

export class YukiBrowserError<
  T extends YukiBrowserErrorCode,
> extends TypedError<T> {
  constructor(code: T, message: string) {
    super(code, message)
    this.name = "YukiBrowserError"
  }

  static new<T extends YukiBrowserErrorCode>(
    code: T,
    message: string
  ): YukiBrowserError<T> {
    return new YukiBrowserError(code, message)
  }

  static override fromAny(e: unknown) {
    return UnexpectedError.fromAny(e)
  }
}

import puppeteer, { type Browser, type Page } from "puppeteer"
import MyBrowser from "~util/browser/browser.js"
import { MyError, MyErrorBase } from "~util/error/index.js"
import { err, ok } from "~util/result/index.js"

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
  static override new(url: string) {
    return MyError.try(async () => {
      const mainUrl = MyBrowser.parseUrl(url)
      if (mainUrl.isErr()) return mainUrl
      const b = await puppeteer.launch()
      const browser = new YukiBrowser(b, mainUrl.value)
      return ok(browser)
    })
  }

  getPuzzles() {
    const selector = 'a[href*="/puzzle/"], a[href*="/puzzles/"]'
    return this.getPage().andThen(async (page) =>
      MyError.try(async () => {
        const links = await page.$$eval(selector, (elements) =>
          elements
            .map((element) => element.href)
            .filter((v, i, a) => a.indexOf(v) === i)
        )
        return ok(links)
      })
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
    return this.browse(url)
      .andThen(async () => await this.getPage())
      .andThen(async (page) => findLoginElements(page))
      .andThen(async ({ page, usernameEl, passwordEl, submitEl }) => {
        await usernameEl.type(username)
        await passwordEl.type(password)
        await Promise.all([page.waitForNavigation(), submitEl.click()])
        this.isLogin = true
        return ok(this)
      })
  }
}

function findLoginElements(page: Page) {
  return MyError.try(async () => {
    let inputs = await page.$$(
      'input[type="text"], input[type="password"], input[name="username"]'
    )
    if (inputs.length < 2)
      inputs = await page.$$('input[type="email"], input[type="password"]')
    if (inputs.length !== 2)
      return err(
        YukiBrowserError.new(
          YukiBrowserErrorCode.LOGIN_INPUT_NOT_FOUND,
          "Unable to find input boxes for login."
        )
      )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const usernameEl = inputs[0]!
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const passwordEl = inputs[1]!

    const submits = await page.$$('button[type="submit"], input[type="submit"]')
    if (submits.length !== 1)
      return err(
        YukiBrowserError.new(
          YukiBrowserErrorCode.SUBMIT_NOT_FOUND,
          "Unable to find submit button."
        )
      )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const submitEl = submits[0]!
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
> extends MyErrorBase<T> {
  private constructor(code: T, message: string) {
    super(code, message)
    this.name = "YukiBrowserError"
  }

  static new<T extends YukiBrowserErrorCode>(
    code: T,
    message: string
  ): YukiBrowserError<T> {
    return new YukiBrowserError(code, message)
  }
}

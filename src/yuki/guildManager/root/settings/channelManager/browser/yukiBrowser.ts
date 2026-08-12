import { err, ok, result, TypedError, UnexpectedError } from "always-panic"
import type { BrowserContext, Page } from "puppeteer"
import MyBrowser from "~util/browser/browser.js"

export class YukiBrowser extends MyBrowser {
  isLogin = false

  constructor(
    context: BrowserContext,
    public mainUrl: URL
  ) {
    super(context)
  }

  /**
   * Create a new YukiBrowser instance, backed by a fresh isolated context
   * in the shared browser.
   * @param url - The main URL for this browser.
   * @returns The new YukiBrowser instance.
   * @throws never
   */
  static override new(url: string) {
    return result.panic(
      result.gen(async function* () {
        const mainUrl = yield* MyBrowser.parseUrl(url)
        const context = yield* YukiBrowser.newContext()
        return ok(new YukiBrowser(context, mainUrl))
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
        new YukiBrowserError(
          YukiBrowserErrorCode.EMPTY_USERNAME,
          "Username cannot be empty."
        )
      )
    if (password === "")
      return err(
        new YukiBrowserError(
          YukiBrowserErrorCode.EMPTY_PASSWORD,
          "Password cannot be empty."
        )
      )
    const self = this
    return result.panic(
      result.gen(async function* () {
        yield* self.browse(url)
        const page = yield* self.getPage()
        const { usernameEl, passwordEl, submitEl } =
          yield* findLoginElements(page)
        return YukiBrowserError.try(async () => {
          await usernameEl.type(username)
          await passwordEl.type(password)
          await Promise.all([page.waitForNavigation(), submitEl.click()])
          self.isLogin = true
          return ok(self)
        })
      })
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
        new YukiBrowserError(
          YukiBrowserErrorCode.LOGIN_INPUT_NOT_FOUND,
          "Unable to find input boxes for login."
        )
      )

    const submits = await page.$$('button[type="submit"], input[type="submit"]')
    const submitEl = submits[0]
    if (submitEl == null || submits.length !== 1)
      return err(
        new YukiBrowserError(
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
  static override fromAny(e: unknown) {
    return UnexpectedError.fromAny(e)
  }
}

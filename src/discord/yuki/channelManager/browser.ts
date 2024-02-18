import puppeteer, { type Browser } from "puppeteer";
import { Err, Ok, asResult, asResultFn } from "../../../misc/result.js";
import { Code, MyError, uid } from "../../../error.js";
import { LoginError, LoginErrorCode } from "./login.js";

/** a week in ms */
const lifespan = 7 * 24 * 60 * 60 * 1000;

class MyBrowser implements Disposable {
  url: URL;
  #browser?: Browser;
  isLogin = false;

  constructor(url: string) {
    this.url = new URL(url);
  }

  private async newBrowser() {
    return MyError.try(async () => {
      const b = await puppeteer.launch({ headless: "new" });
      const p = await b.newPage();
      // p.setDefaultTimeout(10 * 1000)
      // p.setDefaultNavigationTimeout(10 * 1000)
      await p.setViewport({ width: 1280, height: 1024 });
      await p.goto(this.url.href);
      setTimeout(() => this.closeBrowser(b), lifespan);
      return Ok(b);
    });
  }

  private async getBrowser() {
    if (this.#browser != null) return Ok(this.#browser);
    return (await this.newBrowser()).andThen((b) => {
      this.#browser = b;
      return Ok(b);
    });
  }

  private closeBrowser(browser: Browser) {
    if (this.#browser === browser) this.#browser = undefined;
    void browser.close();
  }

  [Symbol.dispose](): void {
    if (this.#browser != null) this.closeBrowser(this.#browser);
  }

  private async getPage() {
    return asResultFn(async () =>
      (await this.getBrowser()).andThenAsync((browser) =>
        MyError.try(async () => {
          const page = (await browser.pages()).at(-1);
          if (page != null) return Ok(page);
          // it looks like puppeteer will have about:blank page
          // before I open a new one so the following never happens
          return Err(
            BrowserError.new(
              BrowserErrorCode.MISSING_PAGE,
              "My browser has all the pages closed."
            )
          );
        })
      )
    );
  }

  async browse(url: string) {
    return (await this.getPage()).andThenAsync(async (page) => {
      await page.goto(url);
      return Ok(this);
    });
  }

  async login(username: string, password: string, url: string) {
    return asResultFn(async () => {
      if (this.isLogin)
        return Err(
          LoginError.new(LoginErrorCode.ALREADY_LOGIN, "already login")
        );
      return (
        await (
          await this.browse(url)
        ).andThenAsync(async () => await this.getPage())
      ).andThenAsync(async (page) =>
        MyError.try(async () =>
          asResultFn(async () => {
            const inputs = await page.$$(
              'input[type="text"], input[type="password"], input[name="username"]'
            );
            if (inputs?.length !== 2)
              return Err(
                BrowserError.new(
                  BrowserErrorCode.INPUT_NOT_FOUND,
                  "Unable to find input boxes."
                )
              );
            await inputs[0].type(username);
            await inputs[1].type(password);
            // submit
            const submit = await page.$$('button[type="submit"]');
            if (submit?.length !== 1)
              return Err(
                BrowserError.new(
                  BrowserErrorCode.SUBMIT_NOT_FOUND,
                  "Unable to find submit button."
                )
              );
            await Promise.all([page.waitForNavigation(), submit[0].click()]);
            this.isLogin = true;
            return Ok(this);
          })
        )
      );
    });
  }

  async getUrl() {
    return asResult(
      await (
        await this.getPage()
      ).andThenAsync((page) => MyError.try(async () => Ok(page.url())))
    );
  }

  async getTitle() {
    return asResult(
      await (
        await this.getPage()
      ).andThenAsync((page) =>
        MyError.try(async () => {
          return Ok(await page.title());
        })
      )
    );
  }

  async getPuzzles() {
    const selector = 'a[href*="/puzzle/"], a[href*="/puzzles/"]';
    return (await this.getPage()).andThenAsync((page) =>
      MyError.try(async () => {
        const links = await page.$$eval(selector, (elements) =>
          elements
            .map((element) => element.href)
            .filter((v, i, a) => a.indexOf(v) === i)
        );
        return Ok(links);
      })
    );
  }

  async screenshot(filename = "test.png") {
    return (await this.getPage()).andThenAsync((page) =>
      MyError.try(async () =>
        Ok(await page.screenshot({ path: filename, fullPage: true }))
      )
    );
  }
}

export { MyBrowser as Browser };

export enum BrowserErrorCode {
  ALREADY_LOGIN = uid(),
  INPUT_NOT_FOUND = uid(),
  SUBMIT_NOT_FOUND = uid(),
  MISSING_PAGE = uid(),
}

export class BrowserError<T extends Code> extends MyError<T> {
  private constructor(code: T, message: string) {
    super(code, message);
    this.name = "BrowserError";
  }

  static new<T extends BrowserErrorCode>(
    code: T,
    message: string
  ): BrowserError<T> {
    return new BrowserError(code, message);
  }
}

/* memo
- test timeout (browse 10.255.255.1)
*/

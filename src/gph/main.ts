import puppeteer, { Browser, Page } from 'puppeteer'
import { Err, Ok, Result } from '../misc/result.js'

/** a week in ms */
const lifespan = 7 * 24 * 60 * 60 * 1000

/** Don't use `new Gph(url)`. Use `await Gph.new(url)` */
export class Gph {
  url?: URL
  #browser?: Browser
  #page?: Page
  #isStarted = false
  isLogin = false

  static async new (url: string): Promise<Result<Gph, string>> {
    const gph = new Gph()
    const res1 = await gph.#start()
    if (res1.err) return res1
    const res2 = await gph.browse(url)
    if (res2.err) return res2
    const res3 = await gph.browse(url)
    if (res3.err) return res3
    return Ok(gph)
  }

  async #start (): Promise<Result<Gph, string>> {
    if (this.#isStarted) return Ok(this)
    try {
      this.#browser = await puppeteer.launch({ headless: 'new' })
      this.#page = await this.#browser.newPage()
      this.#page.setDefaultTimeout(10 * 1000)
      this.#page.setDefaultNavigationTimeout(10 * 1000)
      await this.#page.setViewport({ width: 1280, height: 1024 })
      setTimeout(this.#stop, lifespan)
      this.#isStarted = true
      return Ok(this)
    } catch (e: any) {
      if (e instanceof Error) return Err(e.message)
      return Err('Unknown error when calling Gph.#create')
    }
  }

  #stop (): void {
    void this.#browser?.close()
    this.#browser = undefined
    this.#page = undefined
    this.#isStarted = false
  }

  get browser (): Result<Browser, string> {
    if (this.#browser == null) return Err('Browser is undefined.')
    return Ok(this.#browser)
  }

  get page (): Result<Page, string> {
    if (this.#page == null) return Err('Page is undefined.')
    return Ok(this.#page)
  }

  async browse (url: string): Promise<Result<Page, string>> {
    const res = this.page
    if (res.err) return res
    try {
      const page = res.unwrap()
      await page.goto(url)
      return Ok(page)
    } catch (e: any) {
      if (e instanceof Error) return Err(e.message)
      return Err(`Unknown error when browse to ${url}`)
    }
  }

  async login (
    username: string,
    password: string,
    url: string
  ): Promise<Result<number, string>> {
    if (this.isLogin) return Ok(1)
    const res1 = await this.#start()
    if (res1.err) return res1

    const res2 = await this.browse(url)
    if (res2.err) return res2
    const page = res2.unwrap()

    try {
      const inputs = await page.$$(
        'input[type="text"], input[type="password"], input[name="username"]'
      )
      if (inputs?.length !== 2) return Err('Unable to find input boxes.')
      await inputs[0].type(username)
      await inputs[1].type(password)
      // submit
      const submit = await page.$$('button[type="submit"]')
      if (submit?.length !== 1) return Err('Unable to find submit button.')
      await Promise.all([page.waitForNavigation(), submit[0].click()])
    } catch (e: any) {
      if (e instanceof Error) return Err(e.message)
      return Err('Unknown error when login.')
    }
    this.isLogin = true
    return Ok(0)
  }

  async screenshot (filename = 'test.png'): Promise<void> {
    await this.#page?.screenshot({ path: filename, fullPage: true })
  }

  // async refresh (): Promise<void> {
  //   await this.#page?.reload()
  // }

  async getPuzzles (): Promise<Result<string[], string>> {
    if (this.page.err) return this.page
    const page = this.page.unwrap()
    const selector = 'a[href*="/puzzle/"], a[href*="/puzzles/"]'
    try {
      const links = await page.$$eval(selector, elements =>
        elements
          .map(element => element.href)
          .filter((v, i, a) => a.indexOf(v) === i)
      )
      return Ok(links)
    } catch (e: any) {
      if (e instanceof Error) return Err(e.message)
      return Err('Unknown error when login.')
    }
  }

  async getTitle (): Promise<Result<string, string>> {
    if (this.page.err) return this.page
    const page = this.page.unwrap()
    return Ok(await page.title())
  }

  getUrl (): Result<string, string> {
    return this.page.map(v => v.url())
  }
}

/* memo:
1. can use two browsers to prevent "using while shutting down"
2. getUrl(), getTitle(), screenshot() are not wrapped in try-catch
3. test timeout (browse 10.255.255.1)
*/

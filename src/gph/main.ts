import puppeteer, { Browser, Page } from 'puppeteer'
import { Err, Ok, Result } from '../misc/result.js'

/** Don't use `new Gph(url)`. Use `await Gph.new(url)` */
export class Gph {
  url: URL
  #browser?: Browser
  #page?: Page
  isStarted = false
  isLogin = false

  get browser (): Result<Browser, string> {
    if (this.#browser == null) return Err('Browser is undefined.')
    return Ok(this.#browser)
  }

  get page (): Result<Page, string> {
    if (this.#page == null) return Err('Page is undefined.')
    return Ok(this.#page)
  }

  constructor (url: string) {
    this.url = new URL(url)
  }

  static async new (url: string): Promise<Gph> {
    const gph = new Gph(url)
    return await gph.#start()
  }

  async #start (): Promise<this> {
    if (this.isStarted) return this
    this.#browser = await puppeteer.launch({ headless: 'new' })
    this.#page = await this.#browser.newPage()
    this.#page.setDefaultTimeout(10 * 1000)
    this.#page.setDefaultNavigationTimeout(10 * 1000)
    await this.#page.setViewport({ width: 1280, height: 1024 })
    await this.#page.goto(this.url.href)
    setTimeout(() => {
      void this.#stop()
    }, 7 * 24 * 60 * 60 * 1000)
    this.isStarted = true
    return this
  }

  async #stop (): Promise<void> {
    await this.#browser?.close()
    this.isStarted = false
  }

  async login (
    username: string,
    password: string,
    url?: string
  ): Promise<Result<number, string>> {
    if (this.isLogin) return Ok(1)
    this.isLogin = true
    if (url == null) url = new URL('/login', this.url.origin).href
    // go to login page
    if (this.page.err) return this.page
    const page = this.page.unwrap()
    await page.goto(url)
    // input
    const inputs = await page.$$(
      'input[type="text"], input[type="password"], input[name="username"]'
    )
    if (inputs?.length !== 2) return Err('Unable to find input boxes.')
    await inputs[0].type(username)
    await inputs[1].type(password)
    // submit
    const submit = await page.$$('button[type="submit"]')
    if (submit?.length !== 1) return Err('Unable to find submit button.')
    try {
      await Promise.all([page.waitForNavigation(), submit[0].click()])
    } catch (e: any) {
      if (e instanceof Error) return Err(e.message)
      return Err('Unknown error when login.')
    }
    return Ok(0)
  }

  async screenshot (filename = 'test.png'): Promise<void> {
    await this.#page?.screenshot({ path: filename, fullPage: true })
  }

  async refresh (): Promise<void> {
    await this.#page?.reload()
  }

  async browse (url: string): Promise<void> {
    await this.#page?.goto(url)
  }

  async getPuzzles (): Promise<string[]> {
    const selector = 'a[href*="/puzzle/"], a[href*="/puzzles/"]'
    const links = await this.#page?.$$eval(selector, elements =>
      elements
        .map(element => element.href)
        .filter((v, i, a) => a.indexOf(v) === i)
    )
    return links ?? []
  }

  async getTitle (): Promise<Result<string, string>> {
    if (this.page.err) return this.page
    return Ok(await this.page.unwrap().title())
  }

  getUrl (): Result<string, string> {
    return this.page.map(v => v.url())
  }
}

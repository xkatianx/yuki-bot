import puppeteer, { Browser, Page } from 'puppeteer'
import { debug, fatal } from '../misc/cli.js'

export class Gph {
  url: URL
  #browser?: Browser
  #page?: Page
  isStarted = false
  isLogin = false

  constructor (url: string) {
    this.url = new URL(url)
  }

  async start (): Promise<void> {
    if (this.isStarted) return
    this.isStarted = true
    this.#browser = await puppeteer.launch({ headless: 'new' })
    this.#page = await this.browser.newPage()
    // this.#page.setDefaultTimeout(60 * 1000)
    // this.#page.setDefaultNavigationTimeout(60 * 1000)
    await this.page.setViewport({ width: 1280, height: 1024 })
    await this.page.goto(this.url.href)
  }

  async stop (): Promise<void> {
    await this.browser.close()
  }

  get browser (): Browser {
    return this.#browser ?? fatal('Gph has not been started.')
  }

  get page (): Page {
    return this.#page ?? fatal('Gph has not been started.')
  }

  async login (username: string, password: string, url?: string): Promise<void> {
    if (this.isLogin) return
    this.isLogin = true
    if (url == null) url = new URL('/login', this.url.origin).href
    // go to login page
    await this.page.goto(url)
    // find input boxes
    const inputs = await this.page.$$(
      'input[type="text"], input[type="password"], input[name="username"]'
    )
    if (inputs.length === 2) {
      await inputs[0].type(username)
      await inputs[1].type(password)
    } else {
      // await this.page.type('#id_username', username)
      // await this.page.type('#id_password', password)
      // await this.page.type('input[type="username"]', username)
      // await this.page.type('input[type="password"]', password)
      fatal('try some other way to obtain input boxes')
    }
    // find submit
    const submit = await this.page.$$('button[type="submit"]')
    if (submit.length === 1) {
      await Promise.all([this.page.waitForNavigation(), submit[0].click()])
    } else {
      fatal('try some other way to obtain "submit"')
    }
  }

  async screenshot (): Promise<void> {
    await this.page.screenshot({ path: 'test.png', fullPage: true })
  }

  async refresh (): Promise<void> {
    await this.page.reload()
  }

  async browse (url: string): Promise<void> {
    await this.page.goto(url)
  }

  async getPuzzles (): Promise<string[]> {
    const selector = 'a[href*="/puzzle/"], a[href*="/puzzles/"]'
    const links = await this.page.$$eval(selector, elements =>
      elements.map(element => element.href)
        .filter((v, i, a) => a.indexOf(v) === i)
    )
    debug(links)
    return links
  }

  async getTitle (): Promise<string> {
    return await this.page.title()
  }

  getUrl (): string {
    return this.page.url()
  }
}

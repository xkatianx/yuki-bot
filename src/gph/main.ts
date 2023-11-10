import puppeteer, { Browser, Page } from 'puppeteer'
import { debug, fatal } from '../misc/cli.js'

export class Gph {
  url: URL
  #browser?: Browser
  #page?: Page

  constructor (url: string) {
    this.url = new URL(url)
  }

  async start (): Promise<void> {
    this.#browser = await puppeteer.launch({ headless: 'new' })
    this.#page = await this.browser.newPage()
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

  async login (username: string, password: string): Promise<void> {
    const url = new URL('/login', this.url.origin)
    await this.page.goto(url.href)
    await this.page.type('#id_username', username)
    await this.page.type('#id_password', password)
    // await this.page.type('input[type="username"]', username)
    // await this.page.type('input[type="password"]', password)
    await this.page.click('button[type="submit"]')
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
    const selector = 'table.puzzles-list a[href^="/puzzle/"]'
    const links = await this.page.$$eval(selector, (elements) =>
      elements.map((element) => element.href)
    )
    debug(links)
    return links
  }
}

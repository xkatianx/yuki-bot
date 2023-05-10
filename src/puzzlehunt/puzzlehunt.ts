import { Gsheet } from '../gsheet/gsheet.js'
import { fatal, warn } from '../misc/cli.js'
import { discordTime } from '../misc/time.js'
import { Page, browse } from './browse.js'
import { gphLogin, tokens } from './login.js'
import pkg, { Result } from 'ts-results'
const { Err, Ok } = pkg

export class Puzzlehunt {
  url: string
  mainPage?: Page
  gph?: boolean
  title?: string
  startTime?: string
  endTime?: string
  username?: string
  password?: string
  channel?: string
  ssheet?: Gsheet
  tokens?: tokens
  #isSet: boolean = false
  puzzles: Record<string, Page> = {}

  constructor (url: string, username?: string, password?: string) {
    this.url = url
    this.username = username
    this.password = password
  }

  /** try to fetch info from url */
  async scan (): Promise<void> {
    this.mainPage = await browse(this.url)
    this.title = this.mainPage.title
    // this just simply test if the footer has 'Powered by gph-site'
    this.gph = this.mainPage.data.getElementsByTagName('footer').some(footer =>
      footer.textContent.match('Powered by gph-site') != null
    )
    const timestamps = this.mainPage.data.getElementsByTagName('time')
      .map(time => time.getAttribute('datetime') ?? '')
      .filter(v => v !== '')
    if (timestamps.length === 2) {
      this.setStartTime(timestamps[0])
      this.setEndTime(timestamps[1])
    }
  }

  /** input should be a valid timestamp with timezone
   * like 2023-05-06T10:00:00-07:00
   *
   * return true if the input is valid, false otherwise
   */
  setStartTime (timestamp: string): boolean {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return false
    this.startTime = timestamp
    return true
  }

  /** input should be a valid timestamp with timezone
   * like 2023-05-06T10:00:00-07:00
   *
   * return true if the input is valid, false otherwise
   */
  setEndTime (timestamp: string): boolean {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return false
    this.endTime = timestamp
    return true
  }

  getStartTime (discordFormat: boolean): string {
    if (this.startTime == null) return ''
    return discordFormat
      ? discordTime(new Date(this.startTime))
      : this.startTime
  }

  getEndTime (discordFormat: boolean): string {
    if (this.endTime == null) return ''
    return discordFormat
      ? discordTime(new Date(this.endTime))
      : this.endTime
  }

  printToDiscord (): string {
    const texts = []
    texts.push(`website: ${this.url}`)
    texts.push(`title: \`${this.title ?? ''}\``)
    texts.push(`start: ${this.getStartTime(true)}`)
    texts.push(`end: ${this.getEndTime(true)}`)
    texts.push(`username: \`${this.username ?? ''}\``)
    texts.push(`password: \`${this.password ?? ''}\``)
    return texts.join('\n')
  }

  setSsheet (ssheet: Gsheet): void {
    this.ssheet = ssheet
    this.login().catch(warn)
  }

  getSsheet (): Gsheet {
    return this.ssheet ??
      fatal('Missing ssheet in puzzlehunt.')
  }

  async login (): Promise<boolean> {
    if (this.#isSet) return true
    if (this.url == null) return false
    if (this.username == null) return false
    if (this.password == null) return false
    const res = await gphLogin(this.url, this.username, this.password)
    if (res.err) {
      warn('The following error happens when trying to login:\n', res.val)
      return false
    }
    this.tokens = res.unwrap()
    this.#isSet = true
    return true
  }

  async browse (url: string): Promise<Page> {
    await this.login()
    const page = await browse(url, this.tokens)
    return page
  }

  /** return tab name */
  async appendPuzzle (url: string, tabName?: string): Promise<string> {
    // TODO: detect dupe title
    const page = await this.browse(url)
    if (tabName == null) tabName = page.title
    let [hintUrl, ansUrl] = ['', '']
    // gph style
    if (url.match('/puzzle/') != null) {
      hintUrl = url.replace('/puzzle/', '/hints/')
      ansUrl = url.replace('/puzzle/', '/solve/')
    }
    const gid = await this.getSsheet().newFromTemplate(tabName)
    const [data] = await this.getSsheet().readRanges(['INDEX!A:D'])
    let row = data.values?.length ?? fatal()
    row++
    const escapeTitle = tabName.replaceAll("'", "''")
    await this.getSsheet()
      .writeCell(`INDEX!B${row}`, `=HYPERLINK("#gid=${gid}", "${tabName}")`)
      .writeCell(`INDEX!C${row}`, `='${escapeTitle}'!B1`)
      .writeCell(`INDEX!D${row}`, `='${escapeTitle}'!D1`)
      .writeCell(`'${escapeTitle}'!F1`, `=HYPERLINK("${url}", "PUZZLE")`)
      .writeCell(`'${escapeTitle}'!G1`, `=HYPERLINK("${hintUrl}", "HINT")`)
      .writeCell(`'${escapeTitle}'!H1`, `=HYPERLINK("${ansUrl}", "ANSWER")`)
      .flushWrite()
    return tabName
  }

  async getStat (): Promise<string> {
    const range = await this.getSsheet().readRanges(['INDEX!A:D'])
    const rows = range[0].values ?? [[]]
    const dict: Record<string, number> = {}
    for (const row of rows) {
      const status = row[3]
      if (status in dict) dict[status]++
      else dict[status] = 1
    }
    delete dict.Status
    return JSON.stringify(dict)
  }

  static async from (ssheet: Gsheet): Promise<Result<Puzzlehunt, Error>> {
    try {
      const arr = await ssheet.readRanges([
        'website',
        'username',
        'password'
      ])
      const [url, username, password] = arr.map(v => v.values?.at(0)?.at(0))
      const ph = new Puzzlehunt(url)
      await ph.scan()
      ph.username = username
      ph.password = password
      return Ok(ph)
    } catch (e) {
      if (e instanceof Error) return Err(e)
      else return Err(new Error('Unknown error.'))
    }
  }
}

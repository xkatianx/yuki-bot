import { Gsheet } from '../gsheet/gsheet.js'
import { fatal, warn } from '../misc/cli.js'
import { discordTime } from '../misc/time.js'
import { Page, browse } from './browse.js'
import { gphLogin, tokens } from './login.js'
import pkg, { Result } from 'ts-results'
import { Round } from './round.js'
import { say } from '../discord/error.js'
import { Puzzle } from './puzzle.js'
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
  tmpPuzzles: Record<string, Puzzle> = {}
  puzzles: Record<string, Puzzle> = {}
  rounds: Record<string, Round> = {}

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
    if (timestamps.length >= 2) {
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
  async appendRound (name: string): Promise<string> {
    const [data] = await this.getSsheet().readRanges(['INDEX!A:A'])
    const row = data.values?.length ?? fatal()
    await this.getSsheet()
      .writeCell(`INDEX!A${row + 1}`, '-')
      .writeCell(`INDEX!B${row + 1}`, name)
      .flushWrite()
    return name
  }

  /** return tab name */
  async appendPuzzle (url: string, tabName?: string): Promise<string> {
    // TODO: detect dupe title
    if (tabName == null) {
      const page = await this.browse(url)
      tabName = page.title
    }
    let [hintUrl, ansUrl] = ['', '']
    // gph style
    if (url.match('/puzzle/') != null) {
      hintUrl = url.replace('/puzzle/', '/hints/')
      ansUrl = url.replace('/puzzle/', '/solve/')
    }
    const gid = await this.getSsheet().newFromTemplate(tabName)
    const [data] = await this.getSsheet().readRanges(['INDEX!A:A'])
    const row = data.values?.length ?? fatal()
    const escapeTitle = tabName.replaceAll("'", "''")
    await this.getSsheet()
      .writeCell(`INDEX!A${row + 1}`, `${gid}`)
      .writeCell(`INDEX!B${row + 1}`, tabName)
      .writeCell(`'${escapeTitle}'!A13`, `=HYPERLINK("${url}", "puzzle")`)
      .writeCell(`'${escapeTitle}'!A14`, `=HYPERLINK("${hintUrl}", "hint")`)
      .writeCell(`'${escapeTitle}'!A15`, `=HYPERLINK("${ansUrl}", "answer")`)
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
      const ph = new Puzzlehunt(url, username, password)
      await ph.scan()
      ph.setSsheet(ssheet)
      return Ok(ph)
    } catch (e) {
      if (e instanceof Error) return Err(e)
      else return Err(new Error('Unknown error.'))
    }
  }

  async addRound (url: string, roundName?: string): Promise<[string, Round]> {
    const r = await browse(url, this.tokens) as Round
    roundName = roundName ?? r.title
    if (roundName in this.rounds) say(`round ${roundName} is already added.`)
    this.rounds[roundName] = r
    return [roundName, r]
  }
/*
  async addPuzzle (url: string, puzzleName?: string, roundName?: string) {

  } */
}

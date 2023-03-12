import { browse, Page } from './browse.js'
import { Gsheet } from '../gsheet/gsheet'
import { gphLogin, tokens } from './login.js'
import { fatal } from '../misc/cli.js'

export class PuzzleHunt {
  sheet: Gsheet
  website?: string
  username?: string
  password?: string
  tokens?: tokens
  #isSet: boolean = false

  constructor (sheet: Gsheet) {
    this.sheet = sheet
  }

  async init (): Promise<boolean> {
    if (this.#isSet) return true
    try {
      const arr = await this.sheet.readRanges([
        'website',
        'username',
        'password'
      ])
      ;[this.website, this.username, this.password] = arr.map(v =>
        v.values?.at(0)?.at(0)
      )
      // TODO deal with missing info
      this.#isSet = await this.login()
    } catch (e) {}
    return this.#isSet
  }

  async login (): Promise<boolean> {
    if (this.website == null) return false
    if (this.username == null) return false
    if (this.password == null) return false
    this.tokens = await gphLogin(this.website, this.username, this.password)
    return true
  }

  async browse (url: string): Promise<Page> {
    if (!this.#isSet) await this.init()
    const page = await browse(url, this.tokens)
    return page
  }

  async appendPuzzle (url: string, title?: string): Promise<void> {
    // TODO: detect dupe title
    const page = await this.browse(url)
    if (title == null) title = page.title
    let [hintUrl, ansUrl] = ['', '']
    // gph style
    if (url.match('/puzzle/') != null) {
      hintUrl = url.replace('/puzzle/', '/hints/')
      ansUrl = url.replace('/puzzle/', '/solve/')
    }
    const gid = await this.sheet.newFromTemplate(title)
    let row =
      (await this.sheet.readRanges(['INDEX!A:D']))[0].values?.length ?? fatal()
    row++
    const escapeTitle = title.replaceAll("'", "''")
    await this.sheet
      .writeCell(`INDEX!B${row}`, `=HYPERLINK("#gid=${gid}", "${title}")`)
      .writeCell(`INDEX!C${row}`, `='${escapeTitle}'!B1`)
      .writeCell(`INDEX!D${row}`, `='${escapeTitle}'!D1`)
      .writeCell(`'${escapeTitle}'!F1`, `=HYPERLINK("${url}", "PUZZLE")`)
      .writeCell(`'${escapeTitle}'!G1`, `=HYPERLINK("${hintUrl}", "HINT")`)
      .writeCell(`'${escapeTitle}'!H1`, `=HYPERLINK("${ansUrl}", "ANSWER")`)
      .flushWrite()
  }

  async getStat (): Promise<string> {
    const arrs = (await this.sheet.readRanges(['INDEX!A:D']))[0].values ?? [[]]
    const dict: Record<string, number> = {}
    for (const row of arrs) {
      const status = row[3]
      if (status in dict) dict[status]++
      else dict[status] = 1
    }
    delete dict.Status
    return JSON.stringify(dict)
  }
}

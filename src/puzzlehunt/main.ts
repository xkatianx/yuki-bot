import { browse, Page } from './browse.js'
import { Gsheet } from '../gsheet/gsheet'
import { gphLogin, tokens } from './login.js'
import { fatal } from '../misc/cli.js'

export class PuzzleHunt {
  #sheet?: Gsheet
  website?: string
  username?: string
  password?: string
  tokens?: tokens
  #isSet: boolean = false

  get sheet (): Gsheet {
    return this.#sheet ?? fatal()
  }

  async setSheet (sheet: Gsheet): Promise<boolean> {
    if (this.#isSet) return true
    this.#sheet = sheet
    const arr = await this.#sheet.readRanges(['website', 'username', 'password'])
    ;[this.website, this.username, this.password] = arr.map(v => v.values?.at(0)?.at(0))
    // TODO deal with missing info
    await this.login()
    return this.#isSet
  }

  async login (): Promise<void> {
    if (this.website == null) fatal()
    if (this.username == null) fatal()
    if (this.password == null) fatal()
    this.tokens = await gphLogin(this.website, this.username, this.password)
  }

  async browse (url: string): Promise<Page> {
    if (this.tokens == null) fatal()
    const page = await browse(url, this.tokens)
    return page
  }

  async appendPuzzle (title: string, url: string): Promise<void> {
    const gid = await this.sheet.newFromTemplate(title)
    let row = (await this.sheet.readRanges(['INDEX!A:D']))[0].values?.length ?? fatal()
    row++
    const escapeTitle = title.replaceAll("'", "''")
    await this.sheet
      .writeCell(`INDEX!B${row}`, `=HYPERLINK("#gid=${gid}", "${title}")`)
      .writeCell(`INDEX!C${row}`, `='${escapeTitle}'!B1`)
      .writeCell(`INDEX!D${row}`, `='${escapeTitle}'!D1`)
      .writeCell(`'${escapeTitle}'!F1`, `=HYPERLINK("${url}", "PUZZLE")`)
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

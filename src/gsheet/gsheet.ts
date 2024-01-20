import { GoogleAuth, Compute } from 'google-auth-library'
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth'
import { sheets_v4 } from '@googleapis/sheets'
import { fatal } from '../misc/cli.js'

import * as dotenv from 'dotenv'
import { GFolder } from './folder.js'
import { Result } from '../misc/result.js'
import { Gph } from '../gph/main.js'
dotenv.config()

const sheets = new sheets_v4.Sheets({})
const scopes = ['https://www.googleapis.com/auth/spreadsheets']
const AuthToken = await new GoogleAuth({ scopes }).getClient()

export class GSheet {
  id: string
  spreadsheet: GSpreadsheet

  constructor (spreadsheet: GSpreadsheet, id: string) {
    this.spreadsheet = spreadsheet
    this.id = id
  }
}

export class GSpreadsheet {
  #url?: string
  #id?: string
  requests: sheets_v4.Schema$Request[] = []
  writes: sheets_v4.Schema$ValueRange[] = []
  #gph?: Gph

  static template = {
    settings: GSpreadsheet.fromId(
      '1fLJPiEVf96dAr3mrBRf7ehUepkMCbLAyBYs6qUANVWM'
    ),
    puzzles: GSpreadsheet.fromId('1ASWv9mldgwN3CXQ4-tzWdxKMSB5kVabl7vOR9fJ2314')
  }

  static fromId (id: string): GSpreadsheet {
    const ss = new GSpreadsheet()
    ss.#id = id
    return ss
  }

  static fromUrl (url: string): GSpreadsheet {
    const ss = new GSpreadsheet()
    ss.#url = url
    return ss
  }

  get url (): string {
    if (this.#url == null) {
      if (this.#id == null) {
        fatal('The spreadsheet is not correctly initiallized.')
      }
      this.#url = `https://docs.google.com/spreadsheets/d/${this.#id}`
    }
    return this.#url
  }

  get id (): string {
    if (this.#id == null) {
      this.#id =
        (this.#url ?? '').match(
          'https://docs.google.com/spreadsheets/d/([^/]+)'
        )?.[1] ?? fatal('The folder is not correctly initiallized.')
    }
    return this.#id
  }

  async copyTo (
    folder: GFolder,
    rename?: string
  ): Promise<Result<GSpreadsheet, number>> {
    return await folder.pasteSpreadsheet(this, rename)
  }

  async flush (): Promise<sheets_v4.Schema$Response[] | undefined> {
    const requests = this.requests
    this.requests = []
    const response = await sheets.spreadsheets.batchUpdate({
      auth: AuthToken,
      spreadsheetId: this.id,
      requestBody: { requests }
    })
    return response.data.replies
  }

  async readIndexInfo (): Promise<{
    website: string
    username: string
    password: string
    folder: string
  }> {
    const res = await sheets.spreadsheets.values.batchGet({
      ranges: ['website', 'username', 'password', 'folder'],
      spreadsheetId: this.id,
      auth: AuthToken
    })
    const arr = res.data.valueRanges
    return {
      website: arr?.[0].values?.[0]?.[0] ?? '',
      username: arr?.[1].values?.[0]?.[0] ?? '',
      password: arr?.[2].values?.[0]?.[0] ?? '',
      folder: arr?.[3].values?.[0]?.[0] ?? ''
    }
  }

  async initGph (): Promise<void> {
    const indexInfo = await this.readIndexInfo()
    this.#gph = await Gph.new(indexInfo.website)
    await this.#gph.login(indexInfo.username, indexInfo.password)
  }

  async scanPuzzles (url: string): Promise<string[]> {
    if (this.#gph == null) await this.initGph()
    if (this.#gph == null) fatal('unable to init gph')
    await this.#gph.browse(url)
    return await this.#gph.getPuzzles()
  }

  /** remember to call flushWrite() to actually write */
  writeCell (range: string, value: string): this {
    this.writes.push({
      range,
      values: [[value]]
    })
    return this
  }

  async flushWrite (): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
    const res = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.id,
      auth: AuthToken,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: this.writes
      }
    })
    this.writes = []
    return res.data
  }

  async getSheet (
    sheetName: string
  ): Promise<sheets_v4.Schema$Sheet | undefined> {
    const res = await sheets.spreadsheets.get({
      ranges: [sheetName],
      spreadsheetId: this.id,
      auth: AuthToken
    })
    return res.data.sheets?.at(0)
  }

  dupe (sourceSheetId: number, newSheetName: string): this {
    const duplicateSheet: sheets_v4.Schema$DuplicateSheetRequest = {
      sourceSheetId,
      insertSheetIndex: 2,
      newSheetName
    }
    this.requests.push({ duplicateSheet })
    return this
  }

  show (sheetId: number): this {
    const updateSheetProperties: sheets_v4.Schema$UpdateSheetPropertiesRequest =
      {
        properties: {
          sheetId,
          hidden: false
        },
        fields: 'hidden'
      }
    this.requests.push({ updateSheetProperties })
    return this
  }

  async readRanges (ranges: string[]): Promise<sheets_v4.Schema$ValueRange[]> {
    const res = await sheets.spreadsheets.values.batchGet({
      ranges,
      spreadsheetId: this.id,
      auth: AuthToken
    })
    return res.data.valueRanges ?? fatal()
  }

  /** return new sheet ID */
  async newFromTemplate (sheetName: string): Promise<number> {
    const template =
      (await this.getSheet('TEMPLATE')) ??
      fatal('Missing template in the spreadsheet.')
    const templateId = template.properties?.sheetId ?? fatal()
    const ress = await this.dupe(templateId, sheetName).flush()
    const newSheetId =
      ress?.at(0)?.duplicateSheet?.properties?.sheetId ?? fatal()
    await this.show(newSheetId).flush()
    return newSheetId
  }

  async newPuzzleTab (
    url: string,
    tabName: string
  ): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
    let [hintUrl, ansUrl] = ['', '']
    // gph style
    if (url.match('/puzzle/') != null) {
      hintUrl = url.replace('/puzzle/', '/hints/')
      ansUrl = url.replace('/puzzle/', '/solve/')
    }
    const gid = await this.newFromTemplate(tabName)
    const [data] = await this.readRanges(['INDEX!A:A'])
    const row = data.values?.length ?? fatal()
    const escapeTitle = tabName.replaceAll("'", "''")
    return await this.writeCell(`INDEX!A${row + 1}`, `${gid}`)
      .writeCell(`INDEX!B${row + 1}`, tabName)
      .writeCell(`'${escapeTitle}'!A13`, `=HYPERLINK("${url}", "puzzle")`)
      .writeCell(`'${escapeTitle}'!A14`, `=HYPERLINK("${hintUrl}", "hint")`)
      .writeCell(`'${escapeTitle}'!A15`, `=HYPERLINK("${ansUrl}", "answer")`)
      .flushWrite()
  }
}

// https://developers.google.com/sheets/api/samples
// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request

export class Gsheet {
  auth: JSONClient | Compute
  /** spreadsheet ID */
  id: string
  /** spreadsheet url */
  url: string
  requests: sheets_v4.Schema$Request[] = []
  writes: sheets_v4.Schema$ValueRange[] = []

  constructor (spreadsheetUrl: string) {
    this.url = spreadsheetUrl
    const id = spreadsheetUrl.match(/\/d\/([^/]+)/)?.at(1)
    if (id == null) fatal(`Invalid url: ${spreadsheetUrl}`)
    this.id = id
    this.auth = AuthToken
  }

  async flush (): Promise<sheets_v4.Schema$Response[] | undefined> {
    const requests = this.requests
    this.requests = []
    const response = await sheets.spreadsheets.batchUpdate({
      auth: this.auth,
      spreadsheetId: this.id,
      requestBody: { requests }
    })
    return response.data.replies
  }

  /** return new sheet ID */
  async newFromTemplate (sheetName: string): Promise<number> {
    const template =
      (await this.getSheet('TEMPLATE')) ??
      fatal('Missing template in the spreadsheet.')
    const templateId = template.properties?.sheetId ?? fatal()
    const ress = await this.dupe(templateId, sheetName).flush()
    const newSheetId =
      ress?.at(0)?.duplicateSheet?.properties?.sheetId ?? fatal()
    await this.show(newSheetId).flush()
    return newSheetId
  }

  async readRanges (ranges: string[]): Promise<sheets_v4.Schema$ValueRange[]> {
    const res = await sheets.spreadsheets.values.batchGet({
      ranges,
      spreadsheetId: this.id,
      auth: this.auth
    })
    return res.data.valueRanges ?? fatal()
  }

  async readIndex (): Promise<any[][]> {
    const res = await sheets.spreadsheets.values.get({
      range: 'INDEX!A:E',
      spreadsheetId: this.id,
      auth: this.auth
    })
    return res.data.values ?? fatal()
  }

  writeCell (range: string, value: string): this {
    this.writes.push({
      range,
      values: [[value]]
    })
    return this
  }

  async flushWrite (): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
    const res = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.id,
      auth: this.auth,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: this.writes
      }
    })
    this.writes = []
    return res.data
  }

  newSheet (title: string): this {
    const addSheet: sheets_v4.Schema$AddSheetRequest = {
      properties: {
        title,
        gridProperties: {
          rowCount: 20,
          columnCount: 12
        }
      }
    }
    this.requests.push({ addSheet })
    return this
  }

  async getSheet (
    sheetName: string
  ): Promise<sheets_v4.Schema$Sheet | undefined> {
    const res = await sheets.spreadsheets.get({
      ranges: [sheetName],
      spreadsheetId: this.id,
      auth: this.auth
    })
    return res.data.sheets?.at(0)
  }

  dupe (sourceSheetId: number, newSheetName: string): this {
    const duplicateSheet: sheets_v4.Schema$DuplicateSheetRequest = {
      sourceSheetId,
      insertSheetIndex: 2,
      newSheetName
    }
    this.requests.push({ duplicateSheet })
    return this
  }

  show (sheetId: number): this {
    const updateSheetProperties: sheets_v4.Schema$UpdateSheetPropertiesRequest =
      {
        properties: {
          sheetId,
          hidden: false
        },
        fields: 'hidden'
      }
    this.requests.push({ updateSheetProperties })
    return this
  }

  async copy (sheetId: number): Promise<sheets_v4.Schema$SheetProperties> {
    const res = await sheets.spreadsheets.sheets.copyTo({
      spreadsheetId: this.id,
      sheetId,
      auth: this.auth,
      requestBody: { destinationSpreadsheetId: this.id }
    })
    return res.data
  }
}

export const DefaultSetting = GSpreadsheet.fromId(
  '1fLJPiEVf96dAr3mrBRf7ehUepkMCbLAyBYs6qUANVWM'
)

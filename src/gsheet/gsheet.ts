import { Compute } from 'google-auth-library'
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth'
import { google, sheets_v4 } from 'googleapis'
import { fatal } from '../misc/cli.js'

import * as dotenv from 'dotenv'
import { PuzzleHunt } from '../puzzlehunt/main.js'
dotenv.config()

const sheets = google.sheets('v4')
const scopes = ['https://www.googleapis.com/auth/spreadsheets']

const AuthToken = await new google.auth.GoogleAuth({ scopes }).getClient()

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
  puzzlehunt: PuzzleHunt

  constructor (spreadsheetUrl: string) {
    this.url = spreadsheetUrl
    const id = spreadsheetUrl.match(/\/d\/(.+?)\//)?.at(1)
    if (id == null) throw new Error(`Invalid url: ${spreadsheetUrl}`)
    this.id = id
    this.auth = AuthToken
    this.puzzlehunt = new PuzzleHunt(this)
  }

  async setPuzzlehunt (): Promise<boolean> {
    return await this.puzzlehunt.init()
  }

  async flush (): Promise<sheets_v4.Schema$Response[] | undefined> {
    const response = await sheets.spreadsheets.batchUpdate({
      auth: this.auth,
      spreadsheetId: this.id,
      requestBody: { requests: this.requests }
    })
    this.requests = []
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

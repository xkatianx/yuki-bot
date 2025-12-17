import { sheets_v4 } from "@googleapis/sheets"
import { MyError } from "~util/error/index.js"
import { err, ok } from "~util/result/index.js"
import { myGoogleInfo } from "../auth/auth.js"
import type { GFolder } from "../folder/folder.js"
import { GSheetError, GSheetErrorCode } from "./error.js"

export const sheets = new sheets_v4.Sheets({ auth: myGoogleInfo.auth })

export class GSpreadsheet {
  #id: string
  requests: sheets_v4.Schema$Request[] = []
  writes: sheets_v4.Schema$ValueRange[] = []

  constructor(id: string) {
    this.#id = id
  }

  static fromUrl(url: string) {
    const id = /https:\/\/docs.google.com\/spreadsheets\/d\/([^/?]+)/
      .exec(url)
      ?.at(1)
    if (id != null) return ok(new GSpreadsheet(id))
    return err(
      GSheetError.new(
        GSheetErrorCode.INVALID_URL,
        `\`${url}\` is not a valid url.`
      )
    )
  }

  get url(): string {
    return `https://docs.google.com/spreadsheets/d/${this.#id}`
  }

  get id(): string {
    return this.#id
  }

  /**
   * Copy this spreadsheet to `folder` and return the pasted spreadsheet.
   * @param folder - The folder to copy the spreadsheet to.
   * @param rename - The new name of the spreadsheet.
   * @returns The pasted spreadsheet.
   */
  copyTo(folder: GFolder, rename?: string) {
    return folder.pasteSpreadsheet(this, rename)
  }

  /**
   * Flush pending writes to the spreadsheet.
   * @returns The response from the spreadsheet.
   */
  flushWrite() {
    return GSheetError.try(async () => {
      const writes = this.writes
      this.writes = []
      const res = await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.id,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: writes,
        },
      })
      return ok(res.data)
    })
  }

  /**
   * Write a range to the spreadsheet.
   * Pending requests until `flushWrite()` is called.
   * @param range - The range to write to.
   * @param values - The values to write to the range.
   * @returns This spreadsheet.
   */
  writeRange(range: string, values: unknown[][]): this {
    this.writes.push({
      range,
      values,
    })
    return this
  }

  /**
   * Write a cell to the spreadsheet.
   * Pending requests until `flushWrite()` is called.
   * @param range - The range of the cell to write to.
   * @param value - The value to write to the cell.
   * @returns This spreadsheet.
   */
  writeCell(range: string, value: string): this {
    return this.writeRange(range, [[value]])
  }

  /**
   * Get the first sheet with the given name.
   * @param sheetName - The name of the sheet to get.
   * @returns The sheet.
   */
  getSheet(sheetName: string) {
    return GSheetError.try(async () => {
      const res = await sheets.spreadsheets.get({
        ranges: [sheetName],
        spreadsheetId: this.id,
      })
      return ok(res.data.sheets?.at(0))
    })
  }

  /** flush the requests to the spreadsheet */
  flush() {
    return GSheetError.try(async () => {
      const requests = this.requests
      this.requests = []
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.id,
        requestBody: { requests },
      })
      return ok(response.data.replies)
    })
  }

  /**
   * Add a new sheet with the given title to the spreadsheet.
   * Pending requests until `flush()` is called.
   * @param title - The title of the new sheet.
   * @returns This spreadsheet.
   */
  newSheet(title: string): this {
    const addSheet: sheets_v4.Schema$AddSheetRequest = {
      properties: {
        title,
        gridProperties: {
          rowCount: 20,
          columnCount: 12,
        },
      },
    }
    this.requests.push({ addSheet })
    return this
  }

  /**
   * Duplicate the sheet with the given ID to the spreadsheet.
   * Pending requests until `flush()` is called.
   * @param sourceSheetId - The ID of the sheet to duplicate.
   * @param newSheetName - The name of the new sheet.
   * @returns This spreadsheet.
   */
  dupe(sourceSheetId: number, newSheetName: string): this {
    const duplicateSheet: sheets_v4.Schema$DuplicateSheetRequest = {
      sourceSheetId,
      insertSheetIndex: 2,
      newSheetName,
    }
    this.requests.push({ duplicateSheet })
    return this
  }

  /**
   * Make the sheet with the given ID visible.
   * Pending requests until `flush()` is called.
   * @param sheetId - The ID of the sheet to show.
   * @returns This spreadsheet.
   */
  show(sheetId: number): this {
    const updateSheetProperties: sheets_v4.Schema$UpdateSheetPropertiesRequest =
      {
        properties: {
          sheetId,
          hidden: false,
        },
        fields: "hidden",
      }
    this.requests.push({ updateSheetProperties })
    return this
  }

  /**
   * Read the contents of the given range.
   * @param range - The range to read.
   * @returns The contents of the range.
   */
  readRange(range: string) {
    return GSheetError.try(async () => {
      const res = await sheets.spreadsheets.values.get({
        range,
        spreadsheetId: this.id,
      })
      const contents = res.data.values
      if (contents == null)
        return err(
          GSheetError.new(
            GSheetErrorCode.NO_CONTENTS,
            `No contents in range \`${range}\` in ${this.toString()}`
          )
        )
      return ok(contents as unknown[][])
    })
  }

  /**
   * Read the contents of the given ranges.
   * @param ranges - The ranges to read.
   * @returns The contents of the ranges.
   */
  readRanges(ranges: string[]) {
    return GSheetError.try(async () => {
      const res = await sheets.spreadsheets.values.batchGet({
        ranges,
        spreadsheetId: this.id,
      })
      const output = res.data.valueRanges
      if (output != null) return ok(output)
      return err(
        MyError.unexpected(
          `Null reading \`${ranges.join(", ")}\` in ${this.toString()}`
        )
      )
    })
  }

  toString() {
    return `GSpreadsheet(${this.id})`
  }
}

import { env } from "~misc/env.js"
import { unexpectedMyError } from "~misc/resultExtras.js"
import type { GFolder } from "~util/google/folder/folder"
import {
  PuzzleSheetError,
  PuzzleSheetErrorCode,
} from "~util/google/sheet/error.js"
import { GSpreadsheet } from "~util/google/sheet/sheet.js"
import { err, ok } from "always-panic"

export class PuzzleSheet extends GSpreadsheet {
  /**
   * Create a new PuzzleSheet instance.
   * @param spreadsheet - The spreadsheet of the PuzzleSheet.
   * @throws never
   */
  static from(this: void, spreadsheet: GSpreadsheet) {
    return new PuzzleSheet(spreadsheet.id)
  }

  /**
   * Create a new PuzzleSheet instance from the template.
   * @param rootFolder - The root folder to create the PuzzleSheet in.
   * @param name - The name of the PuzzleSheet.
   * @returns The new PuzzleSheet.
   * @throws never
   */
  static newFromTemplate(rootFolder: GFolder, name?: string) {
    return new GSpreadsheet(env.puzzlesId)
      .copyTo(rootFolder, name ?? env.puzzlesName)
      .map(PuzzleSheet.from)
  }

  /**
   * Read the index information from the spreadsheet,
   * based on the named ranges "website", "username", "password", "folder".
   * @returns The index information.
   * @throws never
   */
  readIndexInfo() {
    return this.readRanges(["website", "username", "password", "folder"])
      .map((arr) => arr.map((r) => String(r.values?.[0]?.[0] ?? "")))
      .map((arr) => ({
        website: arr[0] ?? "",
        username: arr[1] ?? "",
        password: arr[2] ?? "",
        folder: arr[3] ?? "",
      }))
  }

  // async initGph (): Promise<void> {
  //   const indexInfo = await this.readIndexInfo()
  //   this.#gph = (await Gph.new(indexInfo.website)).unwrap()
  //   const loginPaage = new URL('/login', indexInfo.website)
  //   await this.#gph.login(
  //     indexInfo.username,
  //     indexInfo.password,
  //     loginPaage.href
  //   )
  // }

  // async scanPuzzles (url: string): Promise<Result<string[], string>> {
  //   if (this.#gph == null) await this.initGph()
  //   if (this.#gph == null) fatal('unable to init gph')
  //   const res = await this.#gph.browse(url)
  //   if (res.err) return res
  //   return await this.#gph.getPuzzles()
  // }

  /**
   * Create a new sheet from the template.
   * @param sheetName - The name of the new sheet.
   * @returns The new sheet ID.
   * @throws never
   */
  newFromTemplate(sheetName: string) {
    return this.getSheet("TEMPLATE")
      .andThen((template) => {
        if (template != null) return ok(template.properties?.sheetId)
        return err(
          PuzzleSheetError.new(
            PuzzleSheetErrorCode.MISSING_TEMPLATE,
            `Missing template in ${this.toString()}`
          )
        )
      })
      .andThen(async (templateId) => {
        if (templateId != null)
          return await this.dupe(templateId, sheetName).flush()
        return err(
          unexpectedMyError(
            `Unable to get id of TEMPLATE in ${this.toString()}`
          )
        )
      })
      .andThen(async (res) => {
        const newSheetId = res?.at(0)?.duplicateSheet?.properties?.sheetId
        if (newSheetId == null)
          return err(
            unexpectedMyError(
              `Unable to get id of or create \`${sheetName}\` in ${this.toString()}`
            )
          )
        return await this.show(newSheetId)
          .flush()
          .map(() => newSheetId)
      })
  }

  /**
   * Create a new puzzle tab in the spreadsheet.
   * @param url - The URL of the puzzle.
   * @param tabName - The name of the new tab.
   * @returns The new sheet ID.
   * @throws never
   */
  newPuzzleTab(url: string, tabName: string) {
    let [hintUrl, ansUrl] = ["", ""]
    // gph style
    if (url.includes("/puzzle/")) {
      hintUrl = url.replace("/puzzle/", "/hints/")
      ansUrl = url.replace("/puzzle/", "/solve/")
    }

    return this.readRange("INDEX!A:A")
      .andThen(async (data) => {
        const row = data.length + 1
        return this.newFromTemplate(tabName).map((gid) => [gid, row] as const)
      })
      .andThen(async ([gid, row]) => {
        const escapeTitle = tabName.replaceAll("'", "''")
        return this.writeCell(`INDEX!A${row.toString()}`, gid.toString())
          .writeCell(`INDEX!B${row.toString()}`, tabName)
          .writeCell(
            `'${escapeTitle}'!puzzle`,
            `=HYPERLINK("${url}", "puzzle")`
          )
          .writeCell(
            `'${escapeTitle}'!hint`,
            `=HYPERLINK("${hintUrl}", "hint")`
          )
          .writeCell(
            `'${escapeTitle}'!answer`,
            `=HYPERLINK("${ansUrl}", "answer")`
          )
          .flushWrite()
          .map(() => gid)
      })
  }

  /**
   * Create a new round in the spreadsheet.
   * @param name - The name of the round.
   * @returns The result of the operation.
   * @throws never
   */
  newRound(name: string) {
    return this.readRange("INDEX!A:A").andThen((data) => {
      const row = data.length + 1
      return this.writeCell(`INDEX!A${row.toString()}`, "-")
        .writeCell(`INDEX!B${row.toString()}`, name)
        .flushWrite()
    })
  }
}

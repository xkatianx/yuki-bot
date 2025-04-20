import { fatal } from "~/misc/cli.js";

import type { sheets_v4 } from "@googleapis/sheets";

import {
  GSpreadsheet,
  sheets,
} from "./index.js";

export class PuzzleSheet extends GSpreadsheet {
  static from(spreadsheet: GSpreadsheet) {
    return new PuzzleSheet(spreadsheet.id);
  }

  async readIndexInfo(): Promise<{
    website: string;
    username: string;
    password: string;
    folder: string;
  }> {
    const res = await sheets.spreadsheets.values.batchGet({
      ranges: ["website", "username", "password", "folder"],
      spreadsheetId: this.id,
    });
    const arr = res.data.valueRanges;
    return {
      website: arr?.[0].values?.[0]?.[0] ?? "",
      username: arr?.[1].values?.[0]?.[0] ?? "",
      password: arr?.[2].values?.[0]?.[0] ?? "",
      folder: arr?.[3].values?.[0]?.[0] ?? "",
    };
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

  async readIndex(): Promise<unknown[][]> {
    const res = await sheets.spreadsheets.values.get({
      range: "INDEX!A:E",
      spreadsheetId: this.id,
    });
    return res.data.values ?? fatal();
  }

  /** return new sheet ID */
  async newFromTemplate(sheetName: string): Promise<number> {
    const template =
      (await this.getSheet("TEMPLATE")) ??
      fatal("Missing template in the spreadsheet.");
    const templateId = template.properties?.sheetId ?? fatal();
    const ress = await this.dupe(templateId, sheetName).flush();
    const newSheetId =
      ress?.at(0)?.duplicateSheet?.properties?.sheetId ?? fatal();
    await this.show(newSheetId).flush();
    return newSheetId;
  }

  async newPuzzleTab(
    url: string,
    tabName: string,
  ): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
    let [hintUrl, ansUrl] = ["", ""];
    // gph style
    if (url.match("/puzzle/") != null) {
      hintUrl = url.replace("/puzzle/", "/hints/");
      ansUrl = url.replace("/puzzle/", "/solve/");
    }
    const gid = await this.newFromTemplate(tabName);
    const [data] = await this.readRanges(["INDEX!A:A"]);
    const row = data.values?.length ?? fatal();
    const escapeTitle = tabName.replaceAll("'", "''");
    return await this.writeCell(`INDEX!A${row + 1}`, `${gid}`)
      .writeCell(`INDEX!B${row + 1}`, tabName)
      .writeCell(`'${escapeTitle}'!puzzle`, `=HYPERLINK("${url}", "puzzle")`)
      .writeCell(`'${escapeTitle}'!hint`, `=HYPERLINK("${hintUrl}", "hint")`)
      .writeCell(`'${escapeTitle}'!answer`, `=HYPERLINK("${ansUrl}", "answer")`)
      .flushWrite();
  }

  async newRound(name: string) {
    const [data] = await this.readRanges(["INDEX!A:A"]);
    const row = data.values?.length ?? fatal();
    return await this.writeCell(`INDEX!A${row + 1}`, "-")
      .writeCell(`INDEX!B${row + 1}`, name)
      .flushWrite();
  }
}

// https://developers.google.com/sheets/api/samples
// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request

import { GoogleAuth } from "google-auth-library";
import { sheets_v4 } from "@googleapis/sheets";
import { fatal } from "../misc/cli.js";

import * as dotenv from "dotenv";
import { GDriveError, GDriveErrorCode } from "./error.js";
import { Ok, Err } from "../misc/result.js";
import { GFolder } from "./folder.js";
dotenv.config();

const sheets = new sheets_v4.Sheets({});
const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
const AuthToken = await new GoogleAuth({ scopes }).getClient();

export class GSpreadsheet {
  #id: string;
  requests: sheets_v4.Schema$Request[] = [];
  writes: sheets_v4.Schema$ValueRange[] = [];

  static template = {
    settings: new GSpreadsheet("1fLJPiEVf96dAr3mrBRf7ehUepkMCbLAyBYs6qUANVWM"),
    puzzles: new GSpreadsheet("1ASWv9mldgwN3CXQ4-tzWdxKMSB5kVabl7vOR9fJ2314"),
  };

  constructor(id: string) {
    this.#id = id;
  }

  static fromUrl(url: string) {
    const id = url
      .match("https://docs.google.com/spreadsheets/d/([^/?]+)")
      ?.at(1);
    if (id != null) return Ok(new GSpreadsheet(id));
    return Err(
      GDriveError.new(
        GDriveErrorCode.INVALID_URL,
        `\`${url}\` is not a valid url.`
      )
    );
  }

  get url(): string {
    return `https://docs.google.com/spreadsheets/d/${this.#id}`;
  }

  get id(): string {
    return this.#id;
  }

  async copyTo(folder: GFolder, rename?: string) {
    return await folder.pasteSpreadsheet(this, rename);
  }

  async flush(): Promise<sheets_v4.Schema$Response[] | undefined> {
    const requests = this.requests;
    this.requests = [];
    const response = await sheets.spreadsheets.batchUpdate({
      auth: AuthToken,
      spreadsheetId: this.id,
      requestBody: { requests },
    });
    return response.data.replies;
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
      auth: AuthToken,
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

  /** remember to call flushWrite() to actually write */
  writeCell(range: string, value: string): this {
    this.writes.push({
      range,
      values: [[value]],
    });
    return this;
  }

  /** remember to call flushWrite() to actually write */
  writeRange(range: string, values: unknown[][]): this {
    this.writes.push({
      range,
      values,
    });
    return this;
  }

  async flushWrite(): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
    const res = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.id,
      auth: AuthToken,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: this.writes,
      },
    });
    this.writes = [];
    return res.data;
  }

  async getSheet(
    sheetName: string
  ): Promise<sheets_v4.Schema$Sheet | undefined> {
    const res = await sheets.spreadsheets.get({
      ranges: [sheetName],
      spreadsheetId: this.id,
      auth: AuthToken,
    });
    return res.data.sheets?.at(0);
  }

  newSheet(title: string): this {
    const addSheet: sheets_v4.Schema$AddSheetRequest = {
      properties: {
        title,
        gridProperties: {
          rowCount: 20,
          columnCount: 12,
        },
      },
    };
    this.requests.push({ addSheet });
    return this;
  }

  dupe(sourceSheetId: number, newSheetName: string): this {
    const duplicateSheet: sheets_v4.Schema$DuplicateSheetRequest = {
      sourceSheetId,
      insertSheetIndex: 2,
      newSheetName,
    };
    this.requests.push({ duplicateSheet });
    return this;
  }

  show(sheetId: number): this {
    const updateSheetProperties: sheets_v4.Schema$UpdateSheetPropertiesRequest =
      {
        properties: {
          sheetId,
          hidden: false,
        },
        fields: "hidden",
      };
    this.requests.push({ updateSheetProperties });
    return this;
  }

  async readRange(range: string): Promise<unknown[][]> {
    const res = await sheets.spreadsheets.values.get({
      range,
      spreadsheetId: this.id,
      auth: AuthToken,
    });
    return res.data.values ?? fatal();
  }

  async readRanges(ranges: string[]): Promise<sheets_v4.Schema$ValueRange[]> {
    const res = await sheets.spreadsheets.values.batchGet({
      ranges,
      spreadsheetId: this.id,
      auth: AuthToken,
    });
    return res.data.valueRanges ?? fatal();
  }

  async readIndex(): Promise<unknown[][]> {
    const res = await sheets.spreadsheets.values.get({
      range: "INDEX!A:E",
      spreadsheetId: this.id,
      auth: AuthToken,
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
    tabName: string
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

/* TODO
- wrap fns in Result
- delete tmp named range
- rename folder and file after commit
*/

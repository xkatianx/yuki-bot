import { fatal } from "~/misc/cli.js";
import {
  Err,
  Ok,
} from "~/misc/result.js";
import { result } from "~/misc/result/result.js";

import { sheets_v4 } from "@googleapis/sheets";

import { gClient } from "../auth/index.js";
import { GFolder } from "../folder/folder.js";
import {
  GSpreadsheetError,
  GSpreadsheetErrorCode,
} from "./error.js";

export const sheets = new sheets_v4.Sheets({ auth: gClient });

export class GSpreadsheet {
  #id: string;
  requests: sheets_v4.Schema$Request[] = [];
  writes: sheets_v4.Schema$ValueRange[] = [];

  static templateKey = { settings: "settings", puzzles: "puzzles" };

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
      GSpreadsheetError.new(
        GSpreadsheetErrorCode.INVALID_URL,
        `\`${url}\` is not a valid url.`,
      ),
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
      spreadsheetId: this.id,
      requestBody: { requests },
    });
    return response.data.replies;
  }

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

      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: this.writes,
      },
    });
    this.writes = [];
    return res.data;
  }

  async getSheet(
    sheetName: string,
  ): Promise<sheets_v4.Schema$Sheet | undefined> {
    const res = await sheets.spreadsheets.get({
      ranges: [sheetName],
      spreadsheetId: this.id,
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

  async readRange(range: string) {
    return result.wrapAsync(async () => {
      const res = await sheets.spreadsheets.values.get({
        range,
        spreadsheetId: this.id,
      });
      const contents = res.data.values;
      if (contents == null) throw new Error("No contents");
      return contents as string[][];
    });
  }

  async readRanges(ranges: string[]): Promise<sheets_v4.Schema$ValueRange[]> {
    const res = await sheets.spreadsheets.values.batchGet({
      ranges,
      spreadsheetId: this.id,
    });
    return res.data.valueRanges ?? fatal();
  }
}

/* TODO
- wrap fns in Result
- delete tmp named range
*/

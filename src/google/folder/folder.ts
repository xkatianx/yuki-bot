import {
  GoogleAuth,
  type OAuth2Client,
} from "google-auth-library";
import { env } from "~/misc/env.js";
import {
  asResult,
  Err,
  Ok,
} from "~/misc/result.js";

import { drive_v3 } from "@googleapis/drive";

import { SettingSheet } from "../settingSheet.js";
import { GSpreadsheet } from "../spreadsheet.js";
import {
  GFolderError,
  GFolderErrorCode,
} from "./error.js";

const scopes = ["https://www.googleapis.com/auth/drive"];
const AuthToken = (await new GoogleAuth({
  scopes,
}).getClient()) as OAuth2Client;
const drive = new drive_v3.Drive({ auth: AuthToken });

export class GFolder {
  #id: string;

  constructor(id: string) {
    this.#id = id;
  }

  static fromUrl(url: string) {
    const id = url
      .match("https://drive.google.com/drive/(?:u/0/)?folders/([^/?]+)")
      ?.at(1);
    if (id != null) return Ok(new GFolder(id));
    return Err(
      GFolderError.new(
        GFolderErrorCode.INVALID_URL,
        `\`${url}\` is not a valid url.`,
      ),
    );
  }

  get url(): string {
    return `https://drive.google.com/drive/u/0/folders/${this.#id}`;
  }

  get id(): string {
    return this.#id;
  }

  async getName() {
    const r = await GFolderError.try(async () => {
      const res = await drive.files.get({
        fileId: this.id,
        fields: "name",
      });
      const name = res.data.name;
      if (name != null) return Ok(name);
      return Err(
        GFolderError.new(
          GFolderErrorCode.MISSING_TEXT,
          `The folder name is ${String(name)}.`,
        ),
      );
    });
    return r;
  }

  async checkWritePermission() {
    return asResult(
      (
        await GFolderError.try(async () => {
          const res = await drive.permissions.list({
            fileId: this.id,
            fields: "permissions(role, emailAddress, type)",
          });
          const userPermission = res.data.permissions?.find(
            (permission) =>
              permission.type === "user" &&
              permission.emailAddress === env.GG.EMAIL &&
              ["writer", "owner"].includes(permission.role ?? ""),
          );
          if (userPermission != null) return Ok(this);
          return Err(
            GFolderError.new(
              GFolderErrorCode.CANNOT_WRITE,
              `No write permission to ${this.url}`,
            ),
          );
        })
      ).mapErr((e) => {
        if (e.code === GFolderErrorCode.MISSING_FILE) {
          return GFolderError.new(
            GFolderErrorCode.CANNOT_WRITE,
            `No write permission to ${this.url}`,
          );
        } else return e;
      }),
    );
  }

  async newFolder(name: string) {
    return await GFolderError.try(async () => {
      const folder = await drive.files.create({
        requestBody: {
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [this.id],
        },
        fields: "id",
      });
      const id = folder.data.id;
      if (id != null) return Ok(new GFolder(id));
      return Err(GFolderError.unexpected(folder));
    });
  }

  async findFolders(name: string) {
    return await GFolderError.try(async () => {
      const response = await drive.files.list({
        q: [
          `name='${name}'`,
          `'${this.id}' in parents`,
          "mimeType='application/vnd.google-apps.folder'",
        ].join(" and "),
        fields: "files(id, name)",
      });
      const files = response.data.files;
      const folders = files
        ?.filter((file) => file.id != null)
        .map((file) => new GFolder(file.id!));
      if (folders != null && folders.length > 0) return Ok(folders);
      return Err(
        GFolderError.new(
          GFolderErrorCode.MISSING_FOLDER,
          `Folder \`${name}\` does not exist.`,
        ),
      );
    });
  }

  async findUniqueFolder(name: string) {
    return asResult(
      (await this.findFolders(name)).andThen((folders) => {
        if (folders.length === 1) return Ok(folders.pop()!);
        return Err(
          GFolderError.new(
            GFolderErrorCode.MANY_FOLDERS,
            `There are ${folders.length} folders with name \`${name}\`.`,
          ),
        );
      }),
    );
  }

  async getOrCreateFolder(name: string) {
    return asResult(
      await (
        await this.findUniqueFolder(name)
      ).orElseAsync(async (e) => {
        switch (e.code) {
          case GFolderErrorCode.MISSING_FOLDER:
            return await this.newFolder(name);
          default:
            return Err(e);
        }
      }),
    );
  }

  async findSpreadsheets(name: string) {
    return await GFolderError.try(async () => {
      const response = await drive.files.list({
        q: [
          `name='${name}'`,
          `'${this.id}' in parents`,
          "mimeType='application/vnd.google-apps.spreadsheet'",
        ].join(" and "),
        fields: "files(id, name)",
      });
      const files = response.data.files;
      const spreadsheets = files
        ?.filter((file) => file.id != null)
        .map((file) => new GSpreadsheet(file.id!));
      if (spreadsheets != null && spreadsheets.length > 0)
        return Ok(spreadsheets);
      return Err(
        GFolderError.new(
          GFolderErrorCode.MISSING_SPREADSHEET,
          `Spreadsheet \`${name}\` does not exist.`,
        ),
      );
    });
  }

  async findUniqueSpreadsheet(name: string) {
    return asResult(
      (await this.findSpreadsheets(name)).andThen((sheets) => {
        if (sheets.length === 1) return Ok(sheets.pop()!);
        return Err(
          GFolderError.new(
            GFolderErrorCode.MANY_SPREADSHEETS,
            `There are ${sheets.length} spreadsheets with name \`${name}\`.`,
          ),
        );
      }),
    );
  }

  async pasteSpreadsheet(spreadsheet: GSpreadsheet, rename?: string) {
    return await GFolderError.try(async () => {
      const ss = await drive.files.copy({
        fileId: spreadsheet.id,
        requestBody: {
          parents: [this.id],
          name: rename,
        },
      });
      const id = ss.data.id;
      if (id == null) return Err(GFolderError.unexpected(ss));
      return Ok(new GSpreadsheet(id));
    });
  }

  async createDefaultSpreadsheet(name: string) {
    const ss = GSpreadsheet.template.puzzles;
    return await this.pasteSpreadsheet(ss, name);
  }

  async createDefaultSettings() {
    const ss = GSpreadsheet.template.settings;
    return asResult(
      (await this.pasteSpreadsheet(ss, SettingSheet.templateKey.settings)).map(
        (ss) => SettingSheet.from(ss),
      ),
    );
  }
}

// // This doesn't work but I'll leave this here.
// function transferOwner(id: string) {
//   if (env.GG.OWNER == null) return;
//   return drive.permissions.create({
//     fileId: id,
//     transferOwnership: true,
//     requestBody: {
//       role: "owner",
//       type: "user",
//       emailAddress: env.GG.OWNER,
//     },
//   });
// }

/* TODO:
- build an add-on for spreadsheet in case bot doing weird
*/

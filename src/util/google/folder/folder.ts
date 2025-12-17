import { google } from "googleapis"
import { MyError } from "~util/error/index.js"
import { err, ok } from "~util/result/index.js"
import { myGoogleInfo } from "../auth/auth.js"
import { GSpreadsheet } from "../sheet/sheet.js"
import { GFolderError, GFolderErrorCode } from "./error.js"

const drive = google.drive({ version: "v3", auth: myGoogleInfo.auth })

export class GFolder {
  #id: string

  constructor(id: string) {
    this.#id = id
  }

  static fromUrl<T extends typeof GFolder>(this: T, url: string) {
    const id = /https:\/\/drive.google.com\/drive\/(?:u\/0\/)?folders\/([^/?]+)/
      .exec(url)
      ?.at(1)
    if (id != null) return ok(new this(id) as InstanceType<T>)
    return err(
      GFolderError.new(
        GFolderErrorCode.INVALID_URL,
        `\`${url}\` is not a valid url.`
      )
    )
  }

  get url(): string {
    return `https://drive.google.com/drive/u/0/folders/${this.#id}`
  }

  get id(): string {
    return this.#id
  }

  /**
   * Get the name of the current folder.
   * @returns The folder name.
   */
  getName() {
    return GFolderError.try(async () => {
      const res = await drive.files.get({
        fileId: this.id,
        fields: "name",
      })
      const name = res.data.name
      if (name != null) return ok(name)
      return err(
        GFolderError.new(
          GFolderErrorCode.MISSING_TEXT,
          `Unable to get the folder name.`
        )
      )
    })
  }

  /**
   * Check if the current folder has write permission.
   * @returns The current folder.
   */
  checkWritePermission() {
    return GFolderError.try(async () => {
      const res = await drive.permissions.list({
        fileId: this.id,
        fields: "permissions(role, emailAddress, type)",
      })
      const userPermission = res.data.permissions?.find(
        (permission) =>
          permission.type === "user" &&
          permission.emailAddress === myGoogleInfo.email &&
          ["writer", "owner"].includes(permission.role ?? "")
      )
      if (userPermission != null) return ok(this)
      return err(
        GFolderError.new(
          GFolderErrorCode.CANNOT_WRITE,
          `No write permission to ${this.url}`
        )
      )
    })
  }

  /**
   * Create a new folder with the given name in the current folder.
   * @param name - The name of the folder to create.
   * @returns The created folder.
   */
  newFolder(name: string) {
    return GFolderError.try(async () => {
      const folder = await drive.files.create({
        requestBody: {
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [this.id],
        },
        fields: "id",
      })
      const id = folder.data.id
      if (id != null) return ok(new GFolder(id))
      return err(
        GFolderError.new(GFolderErrorCode.CREATION_FAILED, folder.statusText)
      )
    })
  }

  /**
   * Find folders with the given name in the current folder.
   * @param name - The name of the folders to find.
   * @returns The folders found.
   */
  findFolders(name: string) {
    return GFolderError.try(async () => {
      const response = await drive.files.list({
        q: [
          `name='${name}'`,
          `'${this.id}' in parents`,
          "mimeType='application/vnd.google-apps.folder'",
        ].join(" and "),
        fields: "files(id, name)",
      })
      const files = response.data.files
      const folders = files?.flatMap((file) =>
        file.id == null ? [] : new GFolder(file.id)
      )
      if (folders != null && folders.length > 0) return ok(folders)
      return err(
        GFolderError.new(
          GFolderErrorCode.MISSING_FOLDER,
          `Folder \`${name}\` does not exist.`
        )
      )
    })
  }

  /**
   * Find the unique folder with the given name in the current folder.
   * @param name - The name of the folder to find.
   * @returns The folder found.
   */
  findUniqueFolder(name: string) {
    return this.findFolders(name).andThen((folders) => {
      const len = folders.length
      const last = folders.pop()
      if (len === 1 && last != null) return ok(last)
      return err(
        GFolderError.new(
          GFolderErrorCode.MANY_FOLDERS,
          `There are ${len.toString()} folders with name \`${name}\`.`
        )
      )
    })
  }

  /**
   * Get or create a folder with the given name in the current folder.
   * @param name - The name of the folder to get or create.
   * @returns The folder found or created.
   */
  getOrCreateFolder(name: string) {
    return this.findUniqueFolder(name).orElse(async (e) => {
      if (e instanceof GFolderError) {
        if (e.code === GFolderErrorCode.MISSING_FOLDER) {
          return await this.newFolder(name)
        }
      }
      return err(e)
    })
  }

  /**
   * Find spreadsheets with the given name in the current folder.
   * @param name - The name of the spreadsheets to find.
   * @returns The spreadsheets found.
   */
  findSpreadsheets(name: string) {
    return GFolderError.try(async () => {
      const response = await drive.files.list({
        q: [
          `name='${name}'`,
          `'${this.id}' in parents`,
          "mimeType='application/vnd.google-apps.spreadsheet'",
        ].join(" and "),
        fields: "files(id, name)",
      })
      const files = response.data.files
      const spreadsheets = files?.flatMap((file) =>
        file.id == null ? [] : new GSpreadsheet(file.id)
      )
      if (spreadsheets != null && spreadsheets.length > 0)
        return ok(spreadsheets)
      return err(
        GFolderError.new(
          GFolderErrorCode.MISSING_SPREADSHEET,
          `Spreadsheet \`${name}\` does not exist.`
        )
      )
    })
  }

  /**
   * Find the unique spreadsheet with the given name in the current folder.
   * @param name - The name of the spreadsheet to find.
   * @returns The spreadsheet found.
   */
  findUniqueSpreadsheet(name: string) {
    return this.findSpreadsheets(name).andThen((sheets) => {
      const len = sheets.length
      const last = sheets.pop()
      if (len === 1 && last != null) return ok(last)
      return err(
        GFolderError.new(
          GFolderErrorCode.MANY_SPREADSHEETS,
          `There are ${len.toString()} spreadsheets with name \`${name}\`.`
        )
      )
    })
  }

  /**
   * Paste a spreadsheet to the current folder.
   * @param spreadsheet - The spreadsheet to paste.
   * @param rename - The new name of the spreadsheet.
   * @returns The pasted spreadsheet.
   */
  pasteSpreadsheet(spreadsheet: GSpreadsheet, rename?: string) {
    return GFolderError.try(async () => {
      const ss = await drive.files.copy({
        fileId: spreadsheet.id,
        requestBody: {
          parents: [this.id],
          name: rename ?? null,
        },
      })
      const id = ss.data.id
      if (id == null) return err(MyError.unexpected(ss))
      return ok(new GSpreadsheet(id))
    })
  }
}

import { err, ok, UnexpectedError } from "always-panic"
import { google } from "googleapis"
import { myGoogleInfo } from "../auth/auth.js"
import { escapeDriveQuery } from "../misc.js"
import { GSpreadsheet } from "../sheet/sheet.js"
import { GFolderError, GFolderErrorCode } from "./error.js"

const drive = google.drive({ version: "v3", auth: myGoogleInfo.auth })

export class GFolder {
  #id: string

  /**
   * Create a new folder instance.
   * @param id - The ID of the folder.
   * @throws never
   */
  constructor(id: string) {
    this.#id = id
  }

  /**
   * Create a new folder from a url.
   * @param url - The url of the folder to create.
   * @returns The created folder.
   * @throws never
   */
  static fromUrl<T extends typeof GFolder>(this: T, url: string) {
    const id = /https:\/\/drive.google.com\/drive\/(?:u\/0\/)?folders\/([^/?]+)/
      .exec(url)
      ?.at(1)
    if (id != null) return ok(new this(id) as InstanceType<T>)
    return err(
      new GFolderError(
        GFolderErrorCode.INVALID_URL,
        `\`${url}\` is not a valid url.`,
        { url }
      )
    )
  }

  /**
   * Get the URL of the folder.
   * @returns The URL of the folder.
   * @throws never
   */
  get url(): string {
    return `https://drive.google.com/drive/u/0/folders/${this.#id}`
  }

  /**
   * Get the ID of the folder.
   * @returns The ID of the folder.
   * @throws never
   */
  get id(): string {
    return this.#id
  }

  /**
   * Get the name of the current folder.
   * @returns The folder name.
   * @throws never
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
        UnexpectedError.unreachable(
          `data.name should exist. data: ${JSON.stringify(res.data)}`
        )
      )
    })
  }

  /**
   * Check if the current folder has write permission.
   * @returns The current folder.
   * @throws never
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
        new GFolderError(
          GFolderErrorCode.CANNOT_WRITE,
          `No write permission to ${this.url}`,
          { folderId: this.id }
        )
      )
    })
  }

  /**
   * Create a new folder with the given name in the current folder.
   * @param name - The name of the folder to create.
   * @returns The created folder.
   * @throws never
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
        new GFolderError(GFolderErrorCode.CREATION_FAILED, folder.statusText)
      )
    })
  }

  /**
   * Find all (at least one) folders with the given name in the current folder.
   * @param name - The name of the folders to find.
   * @returns The folders found.
   * @throws never
   */
  findFolders(name: string) {
    return GFolderError.try(async () => {
      const response = await drive.files.list({
        q: [
          `name='${escapeDriveQuery(name)}'`,
          `'${this.id}' in parents`,
          "mimeType='application/vnd.google-apps.folder'",
          "trashed=false",
        ].join(" and "),
        fields: "files(id, name)",
      })
      const files = response.data.files
      const folders = files?.flatMap((file) =>
        file.id == null ? [] : new GFolder(file.id)
      )
      if (folders != null && folders.length > 0) return ok(folders)
      return err(
        new GFolderError(
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
   * @throws never
   */
  findUniqueFolder(name: string) {
    return this.findFolders(name).andThen((folders) => {
      const len = folders.length
      const last = folders.pop()
      if (len === 1 && last != null) return ok(last)
      return err(
        new GFolderError(
          GFolderErrorCode.MANY_FOLDERS,
          `There are ${len.toString()} folders with name \`${name}\`.`
        )
      )
    })
  }

  /**
   * Get the unique folder with the given name in the current folder.
   * If there is no folder with the given name, create a new one.
   * @param name - The name of the folder to get or create.
   * @returns The folder found or created.
   * @throws never
   */
  getOrCreateFolder(name: string) {
    return this.findUniqueFolder(name).orElse(async (e) =>
      GFolderError.is(e, GFolderErrorCode.MISSING_FOLDER)
        ? this.newFolder(name)
        : err(e)
    )
  }

  /**
   * Find spreadsheets with the given name in the current folder.
   * @param name - The name of the spreadsheets to find.
   * @returns The spreadsheets found.
   * @throws never
   */
  findSpreadsheets(name: string) {
    return GFolderError.try(async () => {
      const response = await drive.files.list({
        q: [
          `name='${escapeDriveQuery(name)}'`,
          `'${this.id}' in parents`,
          "mimeType='application/vnd.google-apps.spreadsheet'",
          "trashed=false",
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
        new GFolderError(
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
   * @throws never
   */
  findUniqueSpreadsheet(name: string) {
    return this.findSpreadsheets(name).andThen((sheets) => {
      const len = sheets.length
      const last = sheets.pop()
      if (len === 1 && last != null) return ok(last)
      return err(
        new GFolderError(
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
   * @throws never
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
      const data = ss.data
      const id = data.id
      if (id == null)
        return err(
          UnexpectedError.unreachable(
            `data.id should not be null. data:\n${JSON.stringify(data)}`
          )
        )
      return ok(new GSpreadsheet(id))
    })
  }

  /**
   * Move the current folder and all the contents to the trash.
   * @throws never
   */
  moveToTrash() {
    return GFolderError.try(async () => {
      await drive.files.update({
        fileId: this.id,
        requestBody: {
          trashed: true,
        },
      })
      return ok()
    })
  }
}

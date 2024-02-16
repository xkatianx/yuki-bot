import { GoogleAuth } from 'google-auth-library'
import { drive_v3 } from '@googleapis/drive'
import { Err, Ok, Result } from '../misc/result.js'
import { GSpreadsheet } from './gsheet.js'
import { env } from '../misc/env.js'
import { GDriveError, GDriveErrorCode } from './error.js'
import { MyError, MyErrorCode } from '../error.js'

const scopes = ['https://www.googleapis.com/auth/drive']
const AuthToken = await new GoogleAuth({ scopes }).getClient()
const drive = new drive_v3.Drive({ auth: AuthToken })

export class GFolder {
  #id: string

  constructor (id: string) {
    this.#id = id
  }

  static fromUrl (url: string) {
    const id = url
      .match('https://drive.google.com/drive/(?:u/0/)?folders/([^/?]+)')
      ?.at(1)
    if (id != null) return Ok(new GFolder(id))
    return Err(
      GDriveError.new(
        GDriveErrorCode.INVALID_URL,
        `\`${url}\` is not a valid url.`
      )
    )
  }

  get url (): string {
    return `https://drive.google.com/drive/u/0/folders/${this.#id}`
  }

  get id (): string {
    return this.#id
  }

  async getName () {
    try {
      const res = await drive.files.get({
        fileId: this.id,
        fields: 'name'
      })
      const name = res.data.name
      if (name != null) return Ok(name)
      return Err(
        GDriveError.new(
          GDriveErrorCode.MISSING_TEXT,
          `The folder name is ${String(name)}.`
        )
      )
    } catch (e) {
      if (e instanceof Error) return Err(GDriveError.fromError(e))
      else return Err(GDriveError.fromAny(e))
    }
  }

  async checkWritePermission (): Promise<
    Result<
      this,
      | GDriveError<GDriveErrorCode.CANNOT_WRITE>
      | MyError<MyErrorCode.OTHERS>
      | MyError<MyErrorCode.UNKNOWN>
    >
  > {
    return (
      await GDriveError.try(async () => {
        const res = await drive.permissions.list({
          fileId: this.id,
          fields: 'permissions(role, emailAddress, type)'
        })
        const userPermission = res.data.permissions?.find(
          permission =>
            permission.type === 'user' &&
            permission.emailAddress === env.GG.EMAIL &&
            ['writer', 'owner'].includes(permission.role ?? '')
        )
        if (userPermission != null) return Ok(this)
        return Err(
          GDriveError.new(
            GDriveErrorCode.CANNOT_WRITE,
            `No write permission to ${this.url}`
          )
        )
      })
    ).mapErr(e => {
      if (
        e.code === MyErrorCode.OTHERS &&
        e.message.startsWith('File not found:')
      ) {
        return GDriveError.new(
          GDriveErrorCode.CANNOT_WRITE,
          `No write permission to ${this.url}`
        )
      } else return e
    }) as any
  }

  async newFolder (name: string) {
    const folder = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.id]
      },
      fields: 'id'
    })
    const id = folder.data.id
    if (id != null) return Ok(new GFolder(id))
    return Err(GDriveError.unexpected(folder))
  }

  async findFolder (name: string) {
    return await GDriveError.try(async () => {
      const response = await drive.files.list({
        q: [
          `name='${name}'`,
          `'${this.id}' in parents`,
          "mimeType='application/vnd.google-apps.folder'"
        ].join(' and '),
        fields: 'files(id, name)'
      })
      // TODO deal with 2+ results
      const fileId = response.data.files?.at(0)?.id
      if (fileId != null) return Ok(new GFolder(fileId))
      return Err(
        GDriveError.new(
          GDriveErrorCode.MISSING_FOLDER,
          `Folder \`${name}\` does not exist.`
        )
      )
    })
  }

  async getOrCreateFolder (
    name: string
  ): Promise<Result<GFolder, MyError<MyErrorCode>>> {
    const res = await this.findFolder(name)
    if (res.isErr() && res.error.code === GDriveErrorCode.MISSING_FOLDER)
      return await this.newFolder(name)
    return res as any
  }

  async findSpreadsheet (
    name: string
  ): Promise<
    Result<
      GSpreadsheet,
      | GDriveError<GDriveErrorCode.MISSING_FILE>
      | MyError<MyErrorCode.UNKNOWN>
      | MyError<MyErrorCode.OTHERS>
    >
  > {
    return await GDriveError.try(async () => {
      const response = await drive.files.list({
        q: [
          `name='${name}'`,
          `'${this.id}' in parents`,
          "mimeType='application/vnd.google-apps.spreadsheet'"
        ].join(' and '),
        fields: 'files(id, name)'
      })
      // TODO deal with 2+ results
      const spreadsheetId = response.data.files?.at(0)?.id
      if (spreadsheetId != null) return Ok(new GSpreadsheet(spreadsheetId))
      return Err(
        GDriveError.new(
          GDriveErrorCode.MISSING_FILE,
          `Spreadsheet \`${name}\` does not exist.`
        )
      )
    })
  }

  async pasteSpreadsheet (
    spreadsheet: GSpreadsheet,
    rename?: string
  ): Promise<Result<GSpreadsheet, MyError<MyErrorCode>>> {
    return await GDriveError.try(async () => {
      const ss = await drive.files.copy({
        fileId: spreadsheet.id,
        requestBody: {
          parents: [this.id],
          name: rename
        }
      })
      const id = ss.data.id
      if (id != null) return Ok(new GSpreadsheet(id))
      return Err(GDriveError.unexpected(ss))
    })
  }

  async createDefaultSpreadsheet (name: string) {
    const ss = GSpreadsheet.template.puzzles
    return await this.pasteSpreadsheet(ss, name)
  }

  async createDefaultSettings () {
    const ss = GSpreadsheet.template.settings
    return await this.pasteSpreadsheet(ss, 'settings')
  }
}

/* TODO
- build an add-on for spreadsheet in case bot doing weird
*/

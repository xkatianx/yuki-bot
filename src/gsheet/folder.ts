import { GoogleAuth } from 'google-auth-library'
import { drive_v3 } from '@googleapis/drive'

import { fail, fatal } from '../misc/cli.js'
import { Err, Ok, Result } from '../misc/result.js'
import { GSpreadsheet } from './gsheet.js'
import { env } from '../misc/env.js'

const scopes = ['https://www.googleapis.com/auth/drive']
const AuthToken = await new GoogleAuth({ scopes }).getClient()
const drive = new drive_v3.Drive({ auth: AuthToken })

export class GFolder {
  // TODO proper response to invalid folders
  #url?: string
  #id?: string

  static fromId (id: string): GFolder {
    const folder = new GFolder()
    folder.#id = id
    return folder
  }

  static fromUrl (url: string): GFolder {
    const folder = new GFolder()
    folder.#url = url
    return folder
  }

  get url (): string {
    if (this.#url == null) {
      if (this.#id == null) fatal('The folder is not correctly initiallized.')
      this.#url = `https://drive.google.com/drive/u/0/folders/${this.#id}`
    }
    return this.#url
  }

  get id (): string {
    if (this.#id == null) {
      this.#id =
        (this.#url ?? '').match(
          'https://drive.google.com/drive/u/0/folders/(.+)'
        )?.[1] ?? fatal('The folder is not correctly initiallized.')
    }
    return this.#id
  }

  async checkWritePermission (): Promise<Result<null, any>> {
    const permissionsResponse = await (async () => {
      try {
        return Ok(
          await drive.permissions.list({
            fileId: this.id,
            fields: 'permissions(role, emailAddress, type)'
          })
        )
      } catch (e: any) {
        return Err(e)
      }
    })()
    if (permissionsResponse.err) {
      return permissionsResponse
    }
    const permissions = permissionsResponse.unwrap().data.permissions
    const userPermission = permissions?.find(
      permission =>
        permission.type === 'user' &&
        permission.emailAddress === env.GG.EMAIL &&
        ['writer', 'owner'].includes(permission.role ?? '')
    )

    if (userPermission == null) {
      fail(permissions)
      return Err(0)
    }
    return Ok(null)
  }

  async newFolder (name: string): Promise<Result<GFolder, number>> {
    const folder = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.id]
      },
      fields: 'id'
    })
    const id = folder.data.id
    if (id == null) return Err(0)
    return Ok(GFolder.fromId(id))
  }

  async findSpreadSheet (name: string): Promise<Result<GSpreadsheet, string>> {
    const response = await drive.files.list({
      q: `name='${name}' and '${this.id}' in parents and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: 'files(id, name)'
    })
    const files = response.data.files
    // TODO deal with 2+ results
    if (files?.[0] != null) {
      const id = files[0].id
      if (id == null) return Err('empty id')
      return Ok(GSpreadsheet.fromId(id))
    } else {
      return Err('not found')
    }
  }

  async pasteSpreadsheet (
    spreadsheet: GSpreadsheet,
    name?: string
  ): Promise<Result<GSpreadsheet, number>> {
    const ss = await drive.files.copy({
      fileId: spreadsheet.id,
      requestBody: {
        parents: [this.id],
        name
      }
    })
    const id = ss.data.id
    if (id == null) return Err(0)
    return Ok(GSpreadsheet.fromId(id))
  }
}

/** return folder id, or '' if null/undefined */
export async function createFolder (
  folderName: string,
  rootFolderId: string
): Promise<string> {
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId]
    },
    fields: 'id'
  })
  return folder.data.id ?? ''
}

/** return spreadsheet id, or '' if null/undefined */
export async function copySsheetToFolder (
  sheetId: string,
  sheetName: string,
  folderId: string
): Promise<string> {
  const sheet = await drive.files.copy({
    fileId: sheetId,
    requestBody: {
      name: sheetName,
      parents: [folderId]
    }
  })
  return sheet.data.id ?? ''
}

import { GoogleAuth } from 'google-auth-library'
import { drive_v3 } from '@googleapis/drive'

import * as dotenv from 'dotenv'
dotenv.config()

const scopes = ['https://www.googleapis.com/auth/drive']
const AuthToken = await new GoogleAuth({ scopes }).getClient()
const drive = new drive_v3.Drive({ auth: AuthToken })

/** return folder id, or '' if null/undefined */
export async function createFolder (folderName: string, rootFolderId: string): Promise<string> {
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

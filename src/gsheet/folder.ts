import { GoogleAuth } from 'google-auth-library'
import { drive_v3 } from '@googleapis/drive'

import * as dotenv from 'dotenv'
import { env } from '../misc/env.js'
import { fatal } from '../misc/cli.js'
import { Gsheet } from './gsheet.js'
dotenv.config()

const scopes = ['https://www.googleapis.com/auth/drive']
const AuthToken = await new GoogleAuth({ scopes }).getClient()
const drive = new drive_v3.Drive({ auth: AuthToken })

/** return folder id, or '' if null/undefined */
async function createFolder (folderName: string): Promise<string> {
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [env.GG.FOLDER]
    },
    fields: 'id'
  })
  return folder.data.id ?? ''
}

/** return spreadsheet id, or '' if null/undefined */
async function copySsheetToFolder (
  sheetName: string,
  folderId: string
): Promise<string> {
  const sheet = await drive.files.copy({
    fileId: env.GG.SHEET,
    requestBody: {
      name: sheetName,
      parents: [folderId]
    }
  })
  return sheet.data.id ?? ''
}

export async function createFolderAndSsheet (name: string): Promise<Gsheet> {
  const folderId = await createFolder(name)
  if (folderId === '') fatal(`Unable to create folder "${name}"`)
  const folderUrl = `https://drive.google.com/drive/u/0/folders/${folderId}`
  const sSheetId = await copySsheetToFolder(name, folderId)
  if (sSheetId === '') fatal(`Unable to create sheet "${name}"`)
  const sSheetUrl = `https://docs.google.com/spreadsheets/d/${sSheetId}`
  return new Gsheet(sSheetUrl)
    .writeCell('folder', folderUrl)
}
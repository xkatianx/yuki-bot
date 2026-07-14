import type { sheets_v4 } from "@googleapis/sheets"
import { err, ok, UnexpectedError } from "always-panic"

export function getSheetId(
  sheet: sheets_v4.Schema$Sheet | sheets_v4.Schema$DuplicateSheetResponse
) {
  const prop = sheet.properties
  if (prop == null)
    return err(UnexpectedError.unreachable(`Missing properties in sheet`))
  const sheetId = prop.sheetId
  if (sheetId == null)
    return err(
      UnexpectedError.unreachable(`Missing sheetId in sheet.properties`)
    )
  return ok(sheetId)
}

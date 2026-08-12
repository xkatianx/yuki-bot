import { google } from "googleapis"

const scopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
]
const auth = new google.auth.GoogleAuth({
  keyFile: "./secret/google.json",
  scopes,
})

async function myEmail() {
  const drive = google.drive({ version: "v3", auth })
  const res = await drive.about.get({ fields: "user" })
  // biome-ignore lint/style/noNonNullAssertion: ↑
  return res.data.user!.emailAddress
}

const email = await myEmail()
const client = await auth.getClient()

export const myGoogleInfo = {
  email,
  projectId: client.projectId,
  auth,
  client,
}

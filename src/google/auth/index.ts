import "~/misc/env.js";

import { GoogleAuth, type OAuth2Client } from "google-auth-library";

import { drive_v3 } from "@googleapis/drive";

const scopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
];
export const gClient = (await new GoogleAuth({
  scopes,
}).getClient()) as OAuth2Client;

async function myEmail() {
  const drive = new drive_v3.Drive({ auth: gClient });
  const res = await drive.about.get({ fields: "user" });
  return res.data.user?.emailAddress;
}

const email = await myEmail();

export const myGoogleInfo = {
  email,
  projectId: gClient.projectId,
};

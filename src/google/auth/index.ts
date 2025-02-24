import "~/misc/env.js";

import {
  GoogleAuth,
  type OAuth2Client,
} from "google-auth-library";

const scopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
];
export const gClient = (await new GoogleAuth({
  scopes,
}).getClient()) as OAuth2Client;

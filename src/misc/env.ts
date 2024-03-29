import * as dotenv from "dotenv";
import { fatal, warn } from "./cli.js";
dotenv.config();

function required(name: string): string {
  return process.env[name] ?? fatal(`in .env: missing "${name}"`);
}

function optional(name: string): string | undefined {
  return (
    process.env[name] ?? warn(`in .env: missing "${name}"`) ?? process.env[name]
  );
}

export const env = {
  DC: {
    /** Discord Bot CLIENT ID */
    ID: required("id_of_discord_client"),
    /** Discord server ID */
    GID: optional("id_of_discord_server"),
    /** Discord Bot TOKEN */
    TOKEN: required("token_of_discord_bot"),
    /** Discord channel ID for debuging log */
    CID: optional("id_of_dubugging_channel"),
  },
  GG: {
    /** Google Cloud Project ID */
    ID: required("GCLOUD_PROJECT"),
    EMAIL: required("GOOGLE_EMAIL"),
    /** path to credentials (./secret/xxx.json) */
    PATH: required("GOOGLE_APPLICATION_CREDENTIALS"),
  },
};

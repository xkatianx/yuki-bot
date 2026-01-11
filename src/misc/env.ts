import { config } from "dotenv"
import { fatal } from "./cli.js"

config({ path: ".env" })
config({ path: ".env.local", override: true })

function required(name: string): string {
  return process.env[name] ?? fatal(`in .env: missing "${name}"`)
}

function optional(name: string): string | undefined {
  const value = process.env[name]
  // if (value == null) warn(`in .env: missing "${name}"`)
  return value
}

export const env = {
  /** The timezone to use for logs. Default is system local. */
  logTimezone: optional("LOG_TIMEZONE"),
  /** The locale to use for logs. Default is system local. */
  logLocale: optional("LOG_LOCALE"),

  /** Arguments for puppeteer launch, separated by space. */
  puppeteerLaunchArgs: optional("PUPPETEER_LAUNCH_ARGS"),

  /** The name of the template settings spreadsheet */
  settingsName: required("TEMPLATE_SETTINGS_SHEET_NAME"),
  /** The ID of the template settings spreadsheet */
  settingsId: required("TEMPLATE_SETTINGS_SHEET_ID"),
  /** The name of the template puzzles spreadsheet */
  puzzlesName: required("TEMPLATE_PUZZLES_SHEET_NAME"),
  /** The ID of the template puzzles spreadsheet */
  puzzlesId: required("TEMPLATE_PUZZLES_SHEET_ID"),

  DC: {
    /** Discord Bot CLIENT ID */
    ID: required("DISCORD_BOT_ID"),
    /** Discord server ID */
    GID: optional("DISCORD_SERVER_ID"),
    /** Discord Bot TOKEN */
    TOKEN: required("DISCORD_BOT_TOKEN"),
  },
}

// Read https://discordjs.guide/slash-commands/advanced-creation.html
// for advanced usage.

import { ok, result } from "always-panic"
import { REST, Routes } from "discord.js"
import { DiscordError } from "../error.js"
import type { BaseCommand } from "./base.js"

/**
 * Deploy the commands to the Discord API.
 * If `guildId` is provided,
 * the commands will be deployed to the specified guild.
 * Otherwise, the commands will be deployed to all guilds.
 * @param commands - The commands to deploy.
 * @param token - The token of the bot.
 * @param clientId - The client ID of the bot.
 * @param guildId - The guild ID to deploy the commands to.
 */
export function deployCommands(
  commands: BaseCommand[],
  token: string,
  clientId: string,
  guildId?: string
) {
  const routes =
    guildId == null
      ? Routes.applicationCommands(clientId) // for all guilds
      : Routes.applicationGuildCommands(clientId, guildId) // for 1 guild
  const body = commands.map((v) => v.data.toJSON())
  return result.panic(
    DiscordError.try(async () => {
      await new REST({ version: "10" }).setToken(token).put(routes, { body })
      return ok(null)
    })
  )
}

import { AsyncResult } from "always-panic"
import type { Client, Guild, TextChannel } from "discord.js"
import { GatewayIntentBits } from "discord.js"
import { Cache } from "~misc/cache.js"
import { Bot } from "~util/discord/bot.js"
import * as YukiCommands from "./discord/commands.js"
import { getRootFolder } from "./guildManager/root/root.js"
import type { RootFolder } from "./guildManager/root/rootFolder.js"

declare module "discord.js" {
  export interface Client {
    mybot: Yuki
  }
}

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.MessageContent,
] as const

export class Yuki extends Bot {
  /** key = guild.id */
  readonly roots = new Cache<RootFolder>()

  constructor(token: string) {
    super(
      token,
      intents,
      Object.values(YukiCommands).map((v) => v.default)
    )
    this.client.mybot = this
  }

  protected override onReady(readyClient: Client<true>): void {
    // TODO: maybe fetch all log channels on ready
    super.onReady(readyClient)
  }

  /**
   * Get the cached writable root folder for the guild,
   * or create one from the pinned message if it doesn't exist.
   * @param guild - The guild to get the root folder for.
   * @returns The writable root folder for the guild.
   * @throws never
   */
  getRootFolder(guild: Guild) {
    return AsyncResult.from(async () =>
      this.roots.getOrSet(guild.id, getRootFolder.bind(null, this, guild))
    )
  }

  /**
   * Get the cached settings for the guild,
   * or create one if it doesn't exist.
   * @param guild - The guild to get the settings for.
   * @returns The settings for the guild.
   * @throws never
   */
  getSettings(guild: Guild) {
    return this.getRootFolder(guild).andThen((root) => root.getSettings())
  }

  /**
   * Get the cached channel manager for the channel,
   * or create one if it doesn't exist.
   * @param channel - The channel to get the channel manager for.
   * @returns The channel manager for the channel.
   */
  getChannelManager(channel: TextChannel) {
    return this.getSettings(channel.guild).andThen((settings) =>
      settings.getChannelManager(channel)
    )
  }
}

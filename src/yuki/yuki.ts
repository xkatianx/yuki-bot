import type { Client, Guild, TextChannel } from "discord.js"
import { GatewayIntentBits } from "discord.js"
import { Cache } from "~misc/cache.js"
import { lines } from "~misc/format.js"
import { Bot } from "~util/discord/bot.js"
import type { Code, MyErrorBase } from "~util/error/index.js"
import { myGoogleInfo } from "~util/google/auth/auth.js"
import { GFolderError, GFolderErrorCode } from "~util/google/folder/error.js"
import { AsyncResult } from "~util/result/index.js"
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

  static override errorToMessage(e: MyErrorBase<Code>): string {
    if (e instanceof GFolderError) {
      const code = e.code as GFolderErrorCode
      if (code === GFolderErrorCode.CANNOT_WRITE) {
        const email = myGoogleInfo.email
        const target = email == null ? "me" : `\`${email}\``
        return `${e.message}\nPlease add ${target} as an editor.`
      }
      if (code === GFolderErrorCode.MISSING_FILE) {
        const email = myGoogleInfo.email
        const target = email == null ? "me" : `\`${email}\``
        return lines(
          e.message,
          `Please make sure the file exists or add ${target} as a viewer.`
        )
      }
    }
    return super.errorToMessage(e)
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

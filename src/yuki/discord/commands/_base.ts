import type { Code, Result, TypedError } from "always-panic"
import { ok } from "always-panic"
import type {
  ChatInputCommandInteraction,
  Guild,
  Interaction,
  TextBasedChannel,
} from "discord.js"
import { TextChannel } from "discord.js"
import { lines } from "~misc/format.js"
import { type AnyBotLogError, BotLogError } from "~util/discord/bot/log.js"
import { BaseCommand } from "~util/discord/commands/base.js"
import { myGoogleInfo } from "~util/google/auth/auth.js"
import { GFolderError, GFolderErrorCode } from "~util/google/folder/error.js"
import type { Yuki } from "../../yuki.js"

/**
 * Abstract base class for Discord slash commands.
 *
 * This class simplifies command creation by providing:
 * - Automatic command data and execute function structure
 * - Helper methods for common operations
 * - Type-safe access to bot, channel, and guild
 *
 * @example
 * ```typescript
 * export default class MyCommand extends BaseCommand {
 *   buildData() {
 *     return new SlashCommandBuilder()
 *       .setName("mycommand")
 *       .setDescription("My command description")
 *   }
 *
 *   execute(interaction: ChatInputCommandInteraction) {
 *     return AsyncResult.from(async () => {
 *       const ctx = this.getContext(interaction)
 *       if (ctx.isErr()) return ctx
 *       await this.deferReply(interaction)
 *       // Your command logic here
 *       return ok(undefined)
 *     })
 *   }
 * }
 * ```
 */
export abstract class YukiBaseCommand extends BaseCommand {
  /**
   * Get the context (bot, channel, guild) from an interaction.
   * This is a convenience method that wraps interactionFetch.
   */
  protected getContext(
    interaction: ChatInputCommandInteraction
  ): Result<
    { bot: Yuki; channel: TextBasedChannel; guild: Guild },
    AnyBotLogError
  > {
    const bot = interaction.client.mybot
    if (interaction.channel == null)
      return BotLogError.say("This command is not available in this channel.")
    if (interaction.guild == null)
      return BotLogError.say("This command is not available outside a guild.")
    return ok({ bot, channel: interaction.channel, guild: interaction.guild })
  }

  /**
   * Get the text channel from an interaction.
   * @returns `Err` if the channel is not a text channel.
   */
  protected getTextChannel(
    interaction: Interaction
  ): Result<TextChannel, AnyBotLogError> {
    if (interaction.channel instanceof TextChannel)
      return ok(interaction.channel)
    return BotLogError.say("This command is not available in this channel.")
  }

  protected handleError(e: TypedError<Code>): AnyBotLogError {
    if (e instanceof BotLogError) return e
    if (e instanceof GFolderError) {
      const code = e.code as GFolderErrorCode
      if (code === GFolderErrorCode.CANNOT_WRITE) {
        const email = myGoogleInfo.email
        const target = email == null ? "me" : `\`${email}\``
        const message = `${e.message}\nPlease add ${target} as an editor.`
        return BotLogError.say(message).unwrapErr()
      }
      if (code === GFolderErrorCode.MISSING_FILE) {
        const email = myGoogleInfo.email
        const target = email == null ? "me" : `\`${email}\``
        const message = lines(
          e.message,
          `Please make sure the file exists or add ${target} as a viewer.`
        )
        return BotLogError.say(message).unwrapErr()
      }
    }
    return BotLogError.say(e.message, e).unwrapErr()
  }
}

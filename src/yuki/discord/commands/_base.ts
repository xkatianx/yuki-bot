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
import { handleDiscordError } from "~util/discord/bot/action.js"
import { BotLogError } from "~util/discord/bot/log.js"
import { BaseCommand } from "~util/discord/commands/base.js"
import { DiscordError } from "~util/discord/error.js"
import { myGoogleInfo } from "~util/google/auth/auth.js"
import { GFolderError, GFolderErrorCode } from "~util/google/folder/error.js"
import { GSheetError, GSheetErrorCode } from "~util/google/sheet/error.js"
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
 *     const self = this
 *     return result.gen(async function* () {
 *       const ctx = yield* self.getContext(interaction)
 *       await self.deferReply(interaction)
 *       // Your command logic here
 *       return ok()
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
    BotLogError
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
  ): Result<TextChannel, BotLogError> {
    if (interaction.channel instanceof TextChannel)
      return ok(interaction.channel)
    return BotLogError.say("This command is not available in this channel.")
  }

  protected handleError(e: TypedError<Code>): BotLogError {
    if (BotLogError.is(e)) return e
    if (DiscordError.is(e)) return handleDiscordError(e)
    if (GFolderError.is(e)) {
      const email = myGoogleInfo.email
      const target = email == null ? "me" : `\`${email}\``
      return GFolderError.match(e, {
        [GFolderErrorCode.CANNOT_WRITE]: (e) =>
          BotLogError.say(
            `${e.message}\nPlease add ${target} as an editor.`
          ).unwrapErr(),
        [GFolderErrorCode.MISSING_FILE]: (e) =>
          BotLogError.say(
            lines(
              e.message,
              `Please make sure the file exists or add ${target} as a viewer.`
            )
          ).unwrapErr(),
        [GFolderErrorCode.SERVER_ERROR]: (e) => googleServerError(e),
        else: (e) => BotLogError.say(e.message, e).unwrapErr(),
      })
    }
    if (GSheetError.is(e)) {
      return GSheetError.match(e, {
        [GSheetErrorCode.SERVER_ERROR]: (e) => googleServerError(e),
        else: (e) => BotLogError.say(e.message, e).unwrapErr(),
      })
    }
    return BotLogError.say(e.message, e).unwrapErr()
  }
}

/** Google failed on its side (5xx); it's transient, so invite a retry. */
function googleServerError(e: Error): BotLogError {
  return BotLogError.say(
    "Google had a temporary error. Please try again in a moment.",
    e
  ).unwrapErr()
}

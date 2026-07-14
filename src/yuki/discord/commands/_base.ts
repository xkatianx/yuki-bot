import type { Code, MyErrorBase, Result } from "always-panic"
import type {
  ChatInputCommandInteraction,
  Guild,
  Interaction,
  TextBasedChannel,
} from "discord.js"
import { TextChannel } from "discord.js"
import { Bot } from "~util/discord/bot.js"
import { BaseCommand } from "~util/discord/commands/base.js"
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
 *   async execute(interaction: ChatInputCommandInteraction) {
 *     const { bot, channel, guild } = this.getContext(interaction)
 *     await this.deferReply(interaction)
 *     // Your command logic here
 *   }
 * }
 * ```
 */
export abstract class YukiBaseCommand extends BaseCommand {
  /**
   * Get the context (bot, channel, guild) from an interaction.
   * This is a convenience method that wraps interactionFetch.
   */
  protected getContext(interaction: ChatInputCommandInteraction): {
    bot: Yuki
    channel: TextBasedChannel
    guild: Guild
  } {
    const bot = interaction.client.mybot
    const channel =
      interaction.channel ??
      Bot.say("This command is not available in this channel.")
    const guild =
      interaction.guild ??
      Bot.say("This command is not available outside a guild.")
    return { bot, channel, guild }
  }

  /**
   * Get the text channel from an interaction.
   * @throws Yuki.say if the channel is not a text channel.
   */
  protected getTextChannel(interaction: Interaction): TextChannel {
    if (interaction.channel instanceof TextChannel) return interaction.channel
    Bot.say("This command is not available in this channel.")
  }

  /**
   * Unwrap an AsyncResult into a value.
   * @throws Yuki.say if the result is an error.
   */
  protected async unwrap<T>(
    result: PromiseLike<Result<T, MyErrorBase<Code>>>
  ): Promise<T> {
    return (await result).unwrapOrElse((e) => Bot.say(e))
  }
}

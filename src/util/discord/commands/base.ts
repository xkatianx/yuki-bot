import type { AsyncResult } from "always-panic"
import type {
  ChatInputCommandInteraction,
  Interaction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js"
import type { AnyBotLogError } from "~util/discord/bot/log.js"

/**
 * Interaction response function.
 *
 * Returns any *expected* error as an `Err(BotLogError)`; the dispatch boundary
 * reports it to the user. Unexpected failures throw (and are caught centrally).
 */
export type IRF<T extends Interaction> = (
  interaction: T
) => AsyncResult<void, AnyBotLogError>

export abstract class BaseCommand {
  /**
   * Build the slash command data (name, description, options, etc.)
   * This method must be implemented by subclasses.
   */
  abstract buildData():
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    | SlashCommandOptionsOnlyBuilder

  /**
   * Execute the command when invoked.
   * This method must be implemented by subclasses.
   *
   * Any *expected* user-facing error is returned as an `Err(BotLogError)` (e.g.
   * via `BotLogError.say(...)`); the dispatch boundary reports it. Unexpected
   * failures throw out of the returned `AsyncResult` and are caught centrally.
   */
  abstract execute(
    interaction: ChatInputCommandInteraction
  ): AsyncResult<void, AnyBotLogError>

  /**
   * Get the command data. This is automatically generated from buildData().
   */
  get data() {
    return this.buildData()
  }

  /**
   * Defer the reply to the interaction.
   * This is commonly used at the start of commands that take time to process.
   */
  protected async deferReply(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await interaction.deferReply()
  }
}

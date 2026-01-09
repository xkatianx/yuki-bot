import type {
  ChatInputCommandInteraction,
  Interaction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js"

/** interaction response function */
export type IRF<T extends Interaction> = (interaction: T) => Promise<void>

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
   * If this method throws an error, it should be a BotLogError.
   * TODO: make the return type AsyncResult<void, BotLogError>
   */
  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>

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

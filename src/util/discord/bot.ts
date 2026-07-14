import type { Code } from "always-panic"
import { err, MyError, MyErrorBase, ok } from "always-panic"
import type {
  ButtonInteraction,
  Channel,
  ChatInputCommandInteraction,
  GatewayIntentBits,
  Interaction,
  MessagePayload,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  TextChannel,
} from "discord.js"
import { ChannelType, Client, Collection, Events } from "discord.js"
import { done, fail, info, warn } from "~misc/cli.js"
import { displayCodeBlock, lines } from "~misc/format.js"
import { Temporal } from "~misc/time/index.js"
import { noDefault } from "~misc/type.js"
import type { BaseCommand } from "./commands/base.js"
import { BotError, BotErrorCode, BotLogError, ELV } from "./error.js"
import { InteractionHandler } from "./util/interaction.js"

export class Bot {
  readonly client: Client
  protected logChannel = new Collection<string, TextChannel>()
  protected commands = new Collection<string, BaseCommand>()
  #readyTime = Temporal.Now.instant()

  get readyTime() {
    return this.#readyTime
  }

  constructor(
    protected readonly token: string,
    intents: readonly GatewayIntentBits[],
    commands: BaseCommand[]
  ) {
    this.client = new Client({
      intents,
    })
      .on(Events.Warn, (message) => {
        warn("(from discord.js)", message)
      })
      .on(Events.Error, (message) => {
        fail("(from discord.js)", message)
      })
      .once(Events.ClientReady, this.onReady.bind(this))

    // loadCommands
    for (const command of commands) {
      this.commands.set(command.data.name, command)
    }
    this.client.on(Events.InteractionCreate, (interaction) => {
      void this.handleInteraction(interaction)
    })
    // this.client.on(Events.MessageCreate, (message) => {
    //   this.handleMessage(message)
    // })
  }

  protected onReady(readyClient: Client<true>) {
    this.#readyTime = Temporal.Now.instant()
    done(`Ready! Logged in as ${readyClient.user.tag}`)
  }

  /**
   * Login to Discord.
   * @returns This bot instance
   */
  login(): this {
    this.client.login(this.token).catch((e: unknown) => {
      fail("Failed to login discord bot:", e)
      process.exit(1)
    })
    return this
  }

  ///////////////////// Error handling //////////////////////////////

  /**
   * This is called when a slash command has some error and fails to reply
   * to the user, this function will reply to the user instead.
   */
  protected async handleError(
    interaction: Interaction,
    e: unknown
  ): Promise<void> {
    let content = "There was an error while executing this command!"
    let reply = false
    let ephemeral = false

    if (e instanceof BotLogError) {
      switch (e.level) {
        // biome-ignore lint/suspicious/noFallthroughSwitchClause: intentional
        case ELV.PSS:
          ephemeral = true
        // biome-ignore lint/suspicious/noFallthroughSwitchClause: intentional
        case ELV.SAY:
          content = e.message
          reply = true
        case ELV.LOG:
          if (interaction.guild != null)
            (
              await this.logToGuild(
                displayCodeBlock(lines(e.message, e.stack ?? "")),
                interaction.guild.id
              )
            )?.unwrapOrElse((e) => {
              fail(e)
            })
          break
        default:
          fail(e)
      }
    } else fail(e)

    if (
      reply &&
      (interaction.isChatInputCommand() ||
        interaction.isButton() ||
        interaction.isModalSubmit())
    ) {
      try {
        await interaction.reply({ content, ephemeral })
      } catch {
        try {
          await interaction.editReply(content)
        } catch {
          // TODO: this happens when the message is gone or it's been too long
        }
      }
    }
  }

  /**
   * Convert an error to a message to display to the user.
   * @param e - The error to convert to a message
   * @returns The message to display to the user
   * @throws never
   */
  static errorToMessage(e: MyErrorBase<Code>): string {
    if (e instanceof BotError) {
      const code = e.code as BotErrorCode
      switch (code) {
        case BotErrorCode.UNKNOWN_COMMAND:
          return `Unknown command: \`${e.message}\``
        case BotErrorCode.UNKNOWN_BUTTON:
        case BotErrorCode.UNKNOWN_MODAL:
        case BotErrorCode.UNKNOWN_SELECT_MENU:
          return "The action has expired."
        case BotErrorCode.INVALID_LOG_CHANNEL:
          return e.message
        default:
          return noDefault(code)
      }
    }
    return e.message
  }

  /** Reply an ephemeral error message to Discord.
   *  Non-ephemeral if after `deferReply({ ephemeral: false })`
   */
  static pss(e: string | MyErrorBase<Code>, silent = false): never {
    if (!silent) {
      if (e instanceof MyErrorBase) {
        info(e.code, e.message, e.stack)
      } else info(e)
    }
    const message = e instanceof MyErrorBase ? this.errorToMessage(e) : e
    throw new BotLogError(ELV.PSS, message)
  }

  /** Reply an non-ephemeral error message to Discord.
   *  Ephemeral if after `deferReply({ ephemeral: true })`
   */
  static say(e: string | MyErrorBase<Code>, silent = false): never {
    if (!silent) {
      if (e instanceof MyErrorBase) {
        info(e.code, e.message, e.stack)
      } else info(e)
    }
    const message = e instanceof MyErrorBase ? this.errorToMessage(e) : e
    throw new BotLogError(ELV.SAY, message)
  }

  ///////////////////// Interaction handling //////////////////////////////

  // handleMessage(message: OmitPartialGroupDMChannel<Message>) {
  //   console.log(message)
  // }

  /**
   * Handle an interaction.
   * @param i - The interaction to handle
   * @throws freely
   */
  protected async handleInteraction(i: Interaction): Promise<void> {
    try {
      if (i.isChatInputCommand()) await this.actionCommand(i)
      else if (i.isButton()) await this.actionButton(i)
      else if (i.isModalSubmit()) await this.actionModal(i)
      else if (i.isStringSelectMenu()) await this.actionSelectMenu(i)
    } catch (e: unknown) {
      await this.handleError(i, e)
    }
  }

  protected async actionCommand(interaction: ChatInputCommandInteraction) {
    const command = this.commands.get(interaction.commandName)
    if (command == null)
      throw BotError.new(BotErrorCode.UNKNOWN_COMMAND, interaction.commandName)
    await command.execute(interaction)
  }

  protected async actionButton(interaction: ButtonInteraction) {
    const method = InteractionHandler.getButton(interaction.customId)
      .mapErr((e) => BotError.new(BotErrorCode.UNKNOWN_BUTTON, e))
      .unwrap()
    await method(interaction)
  }

  protected async actionModal(interaction: ModalSubmitInteraction) {
    const method = InteractionHandler.getModal(interaction.customId)
      .mapErr((e) => BotError.new(BotErrorCode.UNKNOWN_MODAL, e))
      .unwrap()
    await method(interaction)
  }

  protected async actionSelectMenu(_interaction: StringSelectMenuInteraction) {
    // respond to the select menu
  }

  ///////////////////// Log handling //////////////////////////////

  /**
   * Set the log channel for a guild.
   * @param guildId - The ID of the guild
   * @param channel - The channel to log to
   * @returns This bot instance
   * @throws never
   */
  setLogChannel(guildId: string, channel: Channel) {
    if (channel.type !== ChannelType.GuildText) {
      return err(
        BotError.new(
          BotErrorCode.INVALID_LOG_CHANNEL,
          "A log channel has to be a text channel."
        )
      )
    }
    this.logChannel.set(guildId, channel)
    return ok(this)
  }

  /**
   * Log to a guild in the log channel.
   * @param message - The message to log
   * @param guildId - The ID of the guild
   * @returns The message, or null if the guild does not have a log channel
   * @throws never
   */
  logToGuild(message: string | MessagePayload, guildId: string) {
    const channel = this.logChannel.get(guildId)
    if (channel == null) return null
    return this.logToChannel(message, channel)
  }

  /**
   * Log to a channel.
   * @param message - The message to log
   * @param channel - The channel to log to
   * @returns The message
   * @throws never
   */
  logToChannel(message: string | MessagePayload, channel: TextChannel) {
    return MyError.try(async () => ok(await channel.send(message)))
  }
}

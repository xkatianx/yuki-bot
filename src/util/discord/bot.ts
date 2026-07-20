import { err, ok } from "always-panic"
import type {
  Channel,
  GatewayIntentBits,
  Interaction,
  MessagePayload,
  TextChannel,
} from "discord.js"
import { ChannelType, Client, Collection, Events } from "discord.js"
import { done, fail, warn } from "~misc/cli.js"
import { Temporal } from "~misc/time/index.js"
import {
  actionButton,
  actionCommand,
  actionModal,
  actionSelectMenu,
  actionUnknown,
  toBotLogError,
} from "./bot/action.js"
import { type AnyBotError, BotError, BotErrorCode } from "./bot/error.js"
import { type AnyBotLogError, report } from "./bot/log.js"
import type { BaseCommand } from "./commands/base.js"
import { DiscordError } from "./error.js"

export class Bot {
  readonly client: Client
  protected logChannel = new Collection<string, TextChannel>()
  readonly commands = new Collection<string, BaseCommand>()
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

  /** Report an expected error to Discord. See `./bot/log.js`. */
  protected readonly report = report

  ///////////////////// Interaction handling //////////////////////////////

  // handleMessage(message: OmitPartialGroupDMChannel<Message>) {
  //   console.log(message)
  // }

  /**
   * Handle an interaction.
   *
   * Dispatches to the matching action. Internal failures come back as a
   * `BotError` and user-facing ones as a `BotLogError`; both are normalized by
   * `toBotLogError` and reported via {@link report}.
   * Unexpected throws (Discord API errors, bugs) are caught and logged via `fail`.
   * @param i - The interaction to handle
   */
  protected async handleInteraction(i: Interaction): Promise<void> {
    try {
      const res = await this.route(i)
      if (res.isErr()) await this.report(i, toBotLogError(res.error))
    } catch (e: unknown) {
      fail(e)
    }
  }

  protected route(i: Interaction) {
    if (i.isChatInputCommand()) return this.actionCommand(i)
    if (i.isButton()) return this.actionButton(i)
    if (i.isModalSubmit()) return this.actionModal(i)
    if (i.isStringSelectMenu()) return this.actionSelectMenu(i)
    return this.actionUnknown(i)
  }

  protected readonly actionCommand = actionCommand
  protected readonly actionButton = actionButton
  protected readonly actionModal = actionModal
  protected readonly actionSelectMenu = actionSelectMenu
  protected readonly actionUnknown = actionUnknown

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
        new BotError(
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
    // Deliberately not panicking: this runs inside `report`, so a throw
    // here would escape the error handler itself. Callers swallow the `Err`.
    return DiscordError.try(async () => ok(await channel.send(message)))
  }
}

export type { AnyBotError, AnyBotLogError }

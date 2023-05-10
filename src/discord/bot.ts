// embed sandbox: https://cog-creators.github.io/discord-embed-sandbox/
// emoji response: https://discordjs.guide/popular-topics/reactions.html

import {
  Client,
  GatewayIntentBits,
  Message,
  Collection,
  MessagePayload,
  ChannelType,
  Events,
  TextChannel,
  Channel,
  ButtonInteraction,
  ModalSubmitInteraction
} from 'discord.js'
import {
  CommandObj,
  errorHandler,
  MyIrfs,
  MyCommands,
  IRF
} from './commands/_main.js'
import { done, fail, warn } from '../misc/cli.js'
import { say } from './error.js'

export class Bot {
  #token: string
  client: Client
  #logChannel: Collection<string, TextChannel> = new Collection()
  commands: Collection<string, CommandObj>

  constructor (token: string) {
    this.#token = token
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
      ]
    })
      .on('warn', message => {
        warn('(from discord.js)', message)
      })
      .on('error', message => {
        fail('(from discord.js)', message)
      })
      .once('ready', () => {
        done('Bot is ready.')
        // if (this.#logID != null) this.logChannel('Ready.').catch(fail)
      })

    // loadCommands
    this.commands = new Collection()
    for (const command of Object.values(MyCommands)) {
      this.commands.set(command.data.name, command)
    }
    this.client.on(Events.InteractionCreate, async interaction => {
      try {
        if (interaction.isChatInputCommand()) {
          const command =
            this.commands.get(interaction.commandName) ??
            say(`missing command: ${interaction.commandName}`)
          await command.execute(interaction)
        } else if (interaction.isButton()) {
          const method: IRF<ButtonInteraction> =
            MyIrfs.button[interaction.customId as keyof typeof MyIrfs.button] ??
            say(`missing method: ${interaction.customId}`)
          await method(interaction)
        } else if (interaction.isStringSelectMenu()) {
          // respond to the select menu
        } else if (interaction.isModalSubmit()) {
          const method: IRF<ModalSubmitInteraction> =
            MyIrfs.modal[interaction.customId as keyof typeof MyIrfs.modal] ??
            say(`missing method: ${interaction.customId}`)
          await method(interaction)
        }
      } catch (e: any) {
        await errorHandler(interaction, e)
      }
    })
  }

  setLogChannel (guildId: string, channel: Channel): this {
    if (channel.type !== ChannelType.GuildText) {
      say('It has to be a text channel.')
    }
    this.#logChannel.set(guildId, channel)
    return this
  }

  async log (
    guildId: string,
    message: string | MessagePayload
  ): Promise<Message | null> {
    const channel = this.#logChannel.get(guildId)
    if (channel == null) return null
    return await channel.send(message)
  }

  login (): this {
    this.client.login(this.#token).catch(e => {
      fail('Failed to login discord bot:')
      throw e
    })
    return this
  }
}

// embed sandbox: https://cog-creators.github.io/discord-embed-sandbox/
// emoji response: https://discordjs.guide/popular-topics/reactions.html

import {
  Client,
  GatewayIntentBits,
  Message,
  Collection,
  MessagePayload,
  ChannelType,
  Events
} from 'discord.js'
import { CommandObj, errorHandler, MyIrfs, MyCommands } from './commands/_main.js'
import { done, fail, fatal, warn } from '../misc/cli.js'
import { say } from './error.js'

export class Bot {
  #token: string
  client: Client
  #prefix?: string
  #logID?: string
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
          const command = this.commands.get(interaction.commandName) ??
            say(`missing command: ${interaction.commandName}`)
          await command.execute(interaction)
        } else if (interaction.isButton()) {
          const method = MyIrfs.button[interaction.customId as `b${string}`] ??
            say(`missing method: ${interaction.customId}`)
          await method(interaction)
        } else if (interaction.isStringSelectMenu()) {
          // respond to the select menu
        } else if (interaction.isModalSubmit()) {
          const method = MyIrfs.model[interaction.customId as `m${string}`] ??
            say(`missing method: ${interaction.customId}`)
          await method(interaction)
        }
      } catch (e: any) {
        await errorHandler(interaction, e)
      }
    })
  }

  setLogChannel (channelID: string): this {
    this.#logID = channelID
    return this
  }

  async log (
    message: string | MessagePayload
  ): Promise<Message<boolean> | null> {
    if (this.#logID == null) return null
    const channel = this.client.channels.cache.get(this.#logID)
    if (channel == null) fatal('unable to access this channel:', this.#logID)
    if (channel.type !== ChannelType.GuildText) {
      fatal('this channel is not a text channel:', this.#logID)
    }
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

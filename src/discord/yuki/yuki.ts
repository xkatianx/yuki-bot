import {
  Channel,
  Guild,
  TextChannel
} from 'discord.js'
import { Gsheet } from '../../gsheet/gsheet.js'
import { Bot } from '../bot.js'
import { Puzzlehunt } from '../../puzzlehunt/puzzlehunt.js'
import { Setting } from '../commands/setting.js'
import { say } from '../error.js'

declare module 'discord.js' {
  export interface Client {
    mybot: Yuki
  }
}

export class Yuki extends Bot {
  /** channelID: Gsheet */
  sheets: Record<string, Gsheet> = {}
  /** channelID: Puzzlehunt */
  puzzlehunts: Record<string, Puzzlehunt> = {}
  /** guildID: Setting */
  settings: Record<string, Setting> = {}

  constructor (token: string) {
    super(token)
    this.client.mybot = this
  }

  setPuzzlehunt (channel: string, puzzlehunt: Puzzlehunt): void {
    this.puzzlehunts[channel] = puzzlehunt
  }

  getPuzzlehunt (channel: Channel): Puzzlehunt | undefined {
    return this.puzzlehunts[channel.id]
  }

  async getPuzzlehuntFromSheet (
    channel: Channel,
    errIfEmpty: true
  ): Promise<Puzzlehunt>
  async getPuzzlehuntFromSheet (
    channel: Channel,
    errIfEmpty = false
  ): Promise<Puzzlehunt | undefined> {
    if (this.puzzlehunts[channel.id] == null) {
      const sheet = await this.getSheet(channel)
      if (sheet != null) {
        const ph = (await Puzzlehunt.from(sheet))
          .mapErr(_ => say('Failed to access to the spreadsheet.'))
          .unwrap()
        this.puzzlehunts[channel.id] = ph
      }
    }
    if (errIfEmpty && this.puzzlehunts[channel.id] == null) {
      say('Puzzlehunt has not been set. Please use `/new` first.')
    }
    return this.puzzlehunts[channel.id]
  }

  getSetting (guild: Guild | string): Setting {
    if (typeof guild !== 'string') guild = guild.id
    if (this.settings[guild] == null) {
      this.settings[guild] = new Setting()
    }
    return this.settings[guild]
  }

  /** assume `sheet: {url}` is posted by the bot and pinned */
  async getSheet (channel: Channel): Promise<Gsheet | undefined> {
    const channelId = channel.id
    if (this.sheets[channelId] == null) {
      if (!(channel instanceof TextChannel)) {
        say('This command is not available in this channel.')
      }
      const pinned = await channel.messages.fetchPinned(true)
      for (const m of pinned?.values() ?? []) {
        if (m.author.id !== this.client.user?.id) continue
        if (!m.content.startsWith('sheet:')) continue
        const url = m.content.match(/http[^\b]+/)?.at(0)
        if (url == null) continue
        this.sheets[channelId] = new Gsheet(url)
      }
    }
    return this.sheets[channelId]
  }
}

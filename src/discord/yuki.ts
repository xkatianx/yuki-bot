import { TextChannel } from 'discord.js'
import { Gsheet } from '../gsheet/gsheet.js'
import { Bot } from './bot.js'

declare module 'discord.js' {
  export interface Client {
    mybot: Yuki
  }
}

export class Yuki extends Bot {
  /** channelID: Gsheet */
  sheets: Record<string, Gsheet> = {}

  constructor (token: string) {
    super(token)
    this.client.mybot = this
  }

  /** assume `sheet: {url}` is posted by the bot and pinned */
  async getSheet (channel: TextChannel): Promise<Gsheet | undefined> {
    const channelId = channel.id
    if (this.sheets[channelId] == null) {
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

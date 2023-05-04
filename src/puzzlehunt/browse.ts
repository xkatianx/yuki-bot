import axios, { AxiosRequestConfig } from 'axios'
import { tokens } from './login'
import HTMLParser, { HTMLElement } from 'node-html-parser'
import { fatal } from '../misc/cli.js'
import { say } from '../discord/error.js'
import { discordTime } from '../misc/time.js'

export class Page {
  data: HTMLElement
  title: string

  constructor (data: string) {
    this.data = HTMLParser.parse(data)
    this.title = this.data.getElementsByTagName('title')[0]?.textContent ?? ''
  }

  /** this just simply test if the footer has 'Powered by gph-site' */
  isGphPowered (): boolean {
    return this.data.getElementsByTagName('footer').some(footer =>
      footer.textContent.match('Powered by gph-site') != null
    )
  }

  getTimestamps (): string[] {
    return this.data.getElementsByTagName('time')
      .map(time => time.getAttribute('datetime') ?? '')
      .filter(v => v !== '')
  }

  /** this simply assume if getTimestamps() returns two time,
   * then the first one is starting time */
  getStartTime (discordFormat: true): string
  getStartTime (discordFormat: false): Date | null
  getStartTime (discordFormat: boolean): Date | null | string {
    const ts = this.getTimestamps()
    if (ts.length === 2) {
      return discordFormat
        ? discordTime(new Date(ts[0]))
        : new Date(ts[0])
    } else {
      return discordFormat
        ? ''
        : null
    }
  }

  /** this simply assume if getTimestamps() returns two time,
   * then the second one is ending time */
  getEndTime (discordFormat: true): string
  getEndTime (discordFormat: false): Date | null
  getEndTime (discordFormat: boolean): Date | null | string {
    const ts = this.getTimestamps()
    if (ts.length === 2) {
      return discordFormat
        ? discordTime(new Date(ts[1]))
        : new Date(ts[1])
    } else {
      return discordFormat
        ? ''
        : null
    }
  }
}

export async function browse (url: string, tokens?: tokens): Promise<Page> {
  const config: AxiosRequestConfig = { maxRedirects: 0 }
  if (tokens != null) {
    config.headers = {
      Cookie: `csrftoken=${tokens.csrftoken}; sessionid=${tokens.sessionid}`
    }
  }
  try {
    const res = await axios.get(url, config)
    if (res.status !== 200) say(`Failed to browse ${url}\nError ${res.status}`)
    return new Page(res.data)
  } catch (e: any) {
    if (typeof e.response?.status === 'number') {
      say(`Failed to browse ${url}\nError ${e.response.status as number}`)
    }
    fatal(e)
  }
}

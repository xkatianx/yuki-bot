import axios, { AxiosRequestConfig } from 'axios'
import { tokens } from './login'
import HTMLParser, { HTMLElement } from 'node-html-parser'
import { fatal } from '../misc/cli.js'
import { say } from '../discord/error.js'

export class Page {
  data: HTMLElement
  title: string

  constructor (data: string) {
    this.data = HTMLParser.parse(data)
    this.title = this.data.getElementsByTagName('title')[0]?.textContent ?? ''
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

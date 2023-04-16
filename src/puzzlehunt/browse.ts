import axios from 'axios'
import { tokens } from './login'
import HTMLParser, { HTMLElement } from 'node-html-parser'

export class Page {
  #data: HTMLElement
  title: string

  constructor (data: string) {
    this.#data = HTMLParser.parse(data)
    this.title = this.#data.getElementsByTagName('title')[0]?.textContent ?? ''
  }
}

export async function browse (url: string, tokens?: tokens): Promise<Page> {
  let res
  if (tokens == null) res = await axios.get(url)
  else {
    const config = {
      headers: {
        Cookie: `csrftoken=${tokens.csrftoken}; sessionid=${tokens.sessionid}`
      }
    }
    res = await axios.get(url, config)
  }
  if (res.status !== 200) throw new Error(`Failed to browse ${url}`)
  return new Page(res.data)
}

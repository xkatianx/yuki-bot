import axios from 'axios'
import { tokens } from './login'
export class Page {
  /** pure html */
  data: string
  #title?: string

  constructor (data: string) {
    this.data = data
  }

  get title (): string {
    if (this.#title == null) {
      this.#title = this.data.match(/<title>(.+?)<\/title>/)?.at(1) ?? ''
    }
    return this.#title
  }
}

export async function browse (url: string, tokens: tokens): Promise<Page> {
  const config = {
    headers: {
      Cookie: `csrftoken=${tokens.csrftoken}; sessionid=${tokens.sessionid}`
    }
  }
  const res = await axios.get(url, config)
  if (res.status !== 200) throw new Error(`Failed to browse ${url}`)
  return new Page(res.data)
}

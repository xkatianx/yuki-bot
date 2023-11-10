import { Page } from './browse.js'

export class Puzzle extends Page {
  printToDiscord (): string {
    return `website: ${this.url.href}\n` + `title: \`${this.title}\``
  }
}

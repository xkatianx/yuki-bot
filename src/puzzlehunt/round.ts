import { Page } from './browse.js'

export class Round extends Page {
  puzzles: Record<string, Page> = {}

  getPuzzles (): string[] {
    return this.data.getElementsByTagName('a')
      .map(a => a.getAttribute('href') ?? '')
      .filter(v => v.startsWith('/puzzle/'))
  }

  /** return urls of absent puzzles */
  scan (): URL[] {
    return this.getPuzzles()
      .filter(v => !(v in this.puzzles))
      .map(v => new URL(v, this.url.origin))
  }
}

import chalk from 'chalk'
import readline from 'readline'
import { twNow } from './time.js'
export type asyncFunction = (...args: any[]) => Promise<any>
/** User interaction in CLI.
 *
 * 【Usage】
 *
 * await new Q('\<Your question here>')
 *
 * .add('\<option 1 here>', \<action function here>)
 *
 * .ask()
 *
 * 【Stop waiting for input】
 *
 * Q.end()
 */
export class Q {
  title: string
  descs: string[] = []
  funcs: asyncFunction[] = []
  static rl?: readline.Interface
  constructor (text: string) {
    this.title = text
    if (Q.rl == null) {
      Q.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
    }
  }

  add (desc: string, func: asyncFunction): this {
    this.descs.push(desc)
    this.funcs.push(func)
    return this
  }

  async ask (): Promise<string> {
    const fulltext =
      this.title +
      '\n' +
      this.descs.map((v, i) => `  ${i + 1}. ${v}\n`).join('')
    return await new Promise((resolve, reject) => {
      if (Q.rl == null) return reject(new Error('The interface was closed.'))
      Q.rl.question(fulltext, ans => {
        const foo = this.funcs[parseInt(ans) - 1]
        if (foo != null) {
          foo()
            .then(_ => {
              resolve(ans)
            })
            .catch(e => {
              fail(e)
            })
        } else resolve(ans)
      })
    })
  }

  static end (): void {
    if (Q.rl != null) Q.rl.close()
    Q.rl = undefined
  }
}

const WARN = chalk.black.bgYellowBright(' WARN ')
const DONE = chalk.white.bgGreen(' DONE ')
const FAIL = chalk.black.bgRedBright(' FAIL ')
const INFO = chalk.black.bgBlueBright(' INFO ')
const DEBUG = chalk.red(' DEBUG ')

export function debug (...args: any[]): void {
  console.log(`[${twNow()}]`, DEBUG, ...args)
}
export function done (...args: any[]): void {
  console.log(`[${twNow()}]`, DONE, ...args)
}
export function info (...args: any[]): void {
  console.log(`[${twNow()}]`, INFO, ...args)
}
export function warn (...args: any[]): void {
  console.log(`[${twNow()}]`, WARN, ...args)
}
export function fail (...args: any[]): void {
  console.log(`[${twNow()}]`, FAIL, ...args)
}
export function fatal (...args: any[]): never {
  fail(...args)
  throw new Error('Unexpected failure.')
}

import { fail, warn } from '../misc/cli.js'

/** Error Level */
export enum ELV {
  /** just for debug */
  LOG,
  /** some error messages show to discord */
  SAY,
  /** should not happen */
  BAD
}

export class YukiError extends Error {
  level: ELV
  constructor (level: ELV, message: string) {
    super()
    this.name = 'YukiError'
    this.level = level
    this.message = message
  }
}

export function say (message: string): never {
  warn(message)
  throw new YukiError(ELV.SAY, message)
}

export function bad (message: string): never {
  fail(message)
  throw new YukiError(ELV.BAD, message)
}

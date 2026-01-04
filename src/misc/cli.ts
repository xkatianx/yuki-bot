import chalk from "chalk"
import { now } from "~misc/time/index.js"
import { env } from "./env"

const WARN = chalk.black.bgYellowBright(" WARN ")
const DONE = chalk.white.bgGreen(" DONE ")
const FAIL = chalk.black.bgRedBright(" FAIL ")
const INFO = chalk.black.bgBlueBright(" INFO ")
const DEBUG = chalk.red(" DEBUG ")

export type ToLog = Parameters<typeof console.log>

function timestamp(): string {
  return now(env.logTimezone, env.logLocale)
}

export function debug(...args: ToLog): void {
  console.log(`[${timestamp()}]`, DEBUG, ...args)
}
export function done(...args: ToLog): void {
  console.log(`[${timestamp()}]`, DONE, ...args)
}
export function info(...args: ToLog): void {
  console.log(`[${timestamp()}]`, INFO, ...args)
}
export function warn(...args: ToLog): void {
  console.log(`[${timestamp()}]`, WARN, ...args)
}
export function fail(...args: ToLog): void {
  console.log(`[${timestamp()}]`, FAIL, ...args)
}
export function fatal(...args: ToLog): never {
  fail(...args)
  throw new Error("Unexpected failure.")
}

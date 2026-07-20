import { err, TypedError } from "always-panic"
import type { Interaction } from "discord.js"
import { fail } from "~misc/cli.js"
import { displayCodeBlock, lines } from "~misc/format.js"
import type { Bot } from "../bot.js"

export enum BotLogErrorCode {
  /** just for debug */
  LOG,
  /** some error messages show to discord but ephemeral */
  PSS,
  /** some error messages show to discord */
  SAY,
  /** should not happen */
  BAD,
}

type BotLogErrorInfoMap = {
  [BotLogErrorCode.LOG]: { error: Error }
  [BotLogErrorCode.PSS]: { error?: Error | undefined }
  [BotLogErrorCode.SAY]: { error?: Error | undefined }
  [BotLogErrorCode.BAD]: { error: Error }
}
export type BotLogErrorInfo<C extends BotLogErrorCode> = BotLogErrorInfoMap[C]

export class BotLogError<C extends BotLogErrorCode> extends TypedError<C> {
  declare info: BotLogErrorInfo<C>

  constructor(code: C, message: string, info?: BotLogErrorInfo<C>) {
    super(code, message, info)
    this.name = "BotLogError"
  }

  static log(error: Error) {
    return err(new BotLogError(BotLogErrorCode.LOG, error.message, { error }))
  }

  static pss(message: string, error?: Error) {
    return err(new BotLogError(BotLogErrorCode.PSS, message, { error: error }))
  }

  static say(message: string, error?: Error) {
    return err(new BotLogError(BotLogErrorCode.SAY, message, { error: error }))
  }

  static bad(error: Error) {
    return err(new BotLogError(BotLogErrorCode.BAD, error.message, { error }))
  }
}

export type AnyBotLogError<C extends BotLogErrorCode = BotLogErrorCode> = {
  [K in C]: BotLogError<K>
}[C]

const SHUTDOWN_MESSAGE =
  "An unexpected error happens. " +
  "The bot is shutting down to prevent misbehavior."

/**
 * Report a {@link BotLogError} to Discord. This is the single boundary where
 * expected errors surface to the user.
 *
 * - If `info` carries an `error`, it is logged to the guild's debug channel.
 * - `BAD` additionally shuts the bot down after replying.
 */
export async function report<B extends Bot>(
  this: B,
  i: Interaction,
  e: AnyBotLogError
): Promise<void> {
  await logToDebugChannel.call(this, i, e)

  const content = replyContent(e)
  if (content != null) await replyTo(i, content, e.code === BotLogErrorCode.PSS)

  if (e.code === BotLogErrorCode.BAD) {
    await this.client.destroy()
    process.exit(1)
  }
}

/** Send the underlying error to the guild's debug channel, if there is one. */
async function logToDebugChannel<B extends Bot>(
  this: B,
  i: Interaction,
  e: AnyBotLogError
): Promise<void> {
  const error = e.info?.error
  if (error == null || i.guild == null) return
  const sent = await this.logToGuild(
    displayCodeBlock(lines(e.message, error.stack ?? "")),
    i.guild.id
  )
  // Deliberately not panicking: this runs inside the error handler itself, so
  // a throw here would escape it. Swallow the `Err` into the console instead.
  sent?.unwrapOrElse(fail)
}

/** The message to show the user, or `null` to stay silent. */
function replyContent(e: AnyBotLogError): string | null {
  switch (e.code) {
    case BotLogErrorCode.LOG:
      return null
    case BotLogErrorCode.PSS:
    case BotLogErrorCode.SAY:
      return e.message
    case BotLogErrorCode.BAD:
      return SHUTDOWN_MESSAGE
    default:
      return e satisfies never
  }
}

async function replyTo(
  i: Interaction,
  content: string,
  ephemeral: boolean
): Promise<void> {
  if (!(i.isChatInputCommand() || i.isButton() || i.isModalSubmit())) return
  try {
    await i.reply({ content, ephemeral })
  } catch {
    try {
      await i.editReply(content)
    } catch {
      // TODO: this happens when the message is gone or it's been too long
    }
  }
}

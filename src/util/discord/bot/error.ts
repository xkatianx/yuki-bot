import { TypedError } from "always-panic"
import type { ChatInputCommandInteraction, Interaction } from "discord.js"

export enum BotErrorCode {
  INVALID_LOG_CHANNEL,
  UNKNOWN_COMMAND,
  UNKNOWN_BUTTON,
  UNKNOWN_MODAL,
  UNKNOWN_SELECT_MENU,
  UNKNOWN_INTERACTION,
}

type BotErrorInfoMap = {
  [BotErrorCode.INVALID_LOG_CHANNEL]: undefined
  [BotErrorCode.UNKNOWN_COMMAND]: { interaction: ChatInputCommandInteraction }
  [BotErrorCode.UNKNOWN_BUTTON]: { uid: string }
  [BotErrorCode.UNKNOWN_MODAL]: { uid: string }
  [BotErrorCode.UNKNOWN_SELECT_MENU]: undefined
  [BotErrorCode.UNKNOWN_INTERACTION]: { interaction: Interaction }
}
export type BotErrorInfo<C extends BotErrorCode> = BotErrorInfoMap[C]

export class BotError<T extends BotErrorCode> extends TypedError<T> {
  declare info: BotErrorInfo<T>

  constructor(code: T, message: string, info?: BotErrorInfo<T>) {
    super(code, message, info)
    this.name = "BotError"
  }

  isCode<C extends BotErrorCode>(code: C): this is BotError<C> {
    return (this.code as number) === code
  }
}

export type AnyBotError<C extends BotErrorCode = BotErrorCode> = {
  [K in C]: BotError<K>
}[C]

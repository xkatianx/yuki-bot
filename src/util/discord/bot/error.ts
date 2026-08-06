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

export class BotError<T extends BotErrorCode = BotErrorCode> extends TypedError<
  T,
  BotErrorInfoMap
> {}

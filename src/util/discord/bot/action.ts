import { AsyncResult, err, ok } from "always-panic"
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js"
import type { Bot } from "../bot.js"
import { InteractionHandler } from "../util/interaction.js"
import { type AnyBotError, BotError, BotErrorCode } from "./error.js"
import { type AnyBotLogError, BotLogError } from "./log.js"

export function actionCommand<B extends Bot>(
  this: B,
  interaction: ChatInputCommandInteraction
) {
  const command = this.commands.get(interaction.commandName)
  if (command == null)
    return AsyncResult.from(
      err(
        new BotError(BotErrorCode.UNKNOWN_COMMAND, "unknown command", {
          interaction,
        })
      )
    )
  return command.execute(interaction)
}

export function actionButton<B extends Bot>(
  this: B,
  interaction: ButtonInteraction
) {
  return AsyncResult.from(
    InteractionHandler.getButton(interaction.customId)
  ).andThen((method) => method(interaction))
}

export function actionModal<B extends Bot>(
  this: B,
  interaction: ModalSubmitInteraction
) {
  return AsyncResult.from(
    InteractionHandler.getModal(interaction.customId)
  ).andThen((method) => method(interaction))
}

export function actionSelectMenu<B extends Bot>(
  this: B,
  _interaction: StringSelectMenuInteraction
) {
  // respond to the select menu
  return AsyncResult.from(ok(undefined))
}

export function actionUnknown<B extends Bot>(
  this: B,
  interaction: Interaction
) {
  return AsyncResult.from(
    err(
      new BotError(BotErrorCode.UNKNOWN_INTERACTION, "unknown interaction", {
        interaction,
      })
    )
  )
}

/** Convert an internal {@link BotError} into a user-facing {@link BotLogError}. */
export function handleBotError(e: AnyBotError) {
  switch (e.code) {
    case BotErrorCode.UNKNOWN_COMMAND:
      return BotLogError.pss(
        `Unknown command: \`${e.info.interaction.commandName}\``
      )
    case BotErrorCode.UNKNOWN_BUTTON:
    case BotErrorCode.UNKNOWN_MODAL:
    case BotErrorCode.UNKNOWN_SELECT_MENU:
      return BotLogError.pss("The action has expired.")
    case BotErrorCode.INVALID_LOG_CHANNEL:
      // A misconfiguration; nothing useful to tell the user.
      return BotLogError.log(e)
    case BotErrorCode.UNKNOWN_INTERACTION:
      return BotLogError.pss("This interaction is not supported.", e)
    default:
      return e satisfies never
  }
}

/** Normalize whatever an action returned into the reportable error type. */
export function toBotLogError(e: AnyBotError | AnyBotLogError): AnyBotLogError {
  return e instanceof BotError ? handleBotError(e).unwrapErr() : e
}

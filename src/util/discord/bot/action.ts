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
import { BotError, BotErrorCode } from "./error.js"
import { BotLogError } from "./log.js"

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
  return AsyncResult.from(ok())
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
export function handleBotError(e: BotError) {
  const expired = () => BotLogError.pss("The action has expired.")
  return BotError.match(e, {
    [BotErrorCode.UNKNOWN_COMMAND]: (e) =>
      BotLogError.pss(`Unknown command: \`${e.info.interaction.commandName}\``),
    [BotErrorCode.UNKNOWN_BUTTON]: expired,
    [BotErrorCode.UNKNOWN_MODAL]: expired,
    [BotErrorCode.UNKNOWN_SELECT_MENU]: expired,
    // A misconfiguration; nothing useful to tell the user.
    [BotErrorCode.INVALID_LOG_CHANNEL]: (e) => BotLogError.log(e),
    [BotErrorCode.UNKNOWN_INTERACTION]: (e) =>
      BotLogError.pss("This interaction is not supported.", e),
  })
}

/** Normalize whatever an action returned into the reportable error type. */
export function toBotLogError(e: BotError | BotLogError): BotLogError {
  return BotError.is(e) ? handleBotError(e).unwrapErr() : e
}

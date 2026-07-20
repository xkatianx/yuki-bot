import { err, ok } from "always-panic"
import type { ButtonInteraction, ModalSubmitInteraction } from "discord.js"
import { fatal } from "~misc/cli.js"
import { Temporal } from "~misc/time/index.js"
import { BotError, BotErrorCode } from "../bot/error.js"
import type { IRF } from "../commands/base.js"

const buttonFns = new Map<string, IRF<ButtonInteraction>>()

const modalFns = new Map<string, IRF<ModalSubmitInteraction>>()

function getUid(): string {
  const uid = [
    Temporal.Now.instant().epochMilliseconds.toString(),
    Math.random().toString(36).substring(2, 15),
  ].join("-")
  if (buttonFns.has(uid) || modalFns.has(uid))
    fatal(`"getUid" doesn't work properly.`)
  return uid
}

/** Return the UID of the function */
function setButton(fn: IRF<ButtonInteraction>): string {
  const uid = getUid()
  buttonFns.set(uid, fn)
  return uid
}

/** Return the UID of the function */
function setModal(fn: IRF<ModalSubmitInteraction>): string {
  const uid = getUid()
  modalFns.set(uid, fn)
  return uid
}

function getButton(uid: string) {
  const fn = buttonFns.get(uid)
  if (fn == null)
    return err(
      new BotError(BotErrorCode.UNKNOWN_BUTTON, "unknown button", { uid })
    )
  return ok(fn)
}

function getModal(uid: string) {
  const fn = modalFns.get(uid)
  if (fn == null)
    return err(
      new BotError(BotErrorCode.UNKNOWN_MODAL, "unknown modal", { uid })
    )
  return ok(fn)
}

export const InteractionHandler = {
  buttonFns,
  modalFns,
  getButton,
  getModal,
  setButton,
  setModal,
}

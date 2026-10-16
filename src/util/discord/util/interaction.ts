import { err, ok } from "always-panic"
import type { ButtonInteraction, ModalSubmitInteraction } from "discord.js"
import { fatal } from "~misc/cli.js"
import { Temporal } from "~misc/time/index.js"
import { HOUR } from "~misc/time/ms.js"
import { BotError, BotErrorCode } from "../bot/error.js"
import type { IRF } from "../commands/base.js"

const buttonFns = new Map<string, IRF<ButtonInteraction>>()

const modalFns = new Map<string, IRF<ModalSubmitInteraction>>()

/**
 * How long a registered handler stays callable. Without expiry every handler
 * (and the form/interaction/channel its closure captures) would be retained
 * forever. Handlers can fire more than once (e.g. a form's Edit button), so
 * they are expired by time rather than removed on first use.
 */
const HANDLER_TTL_MS = 1 * HOUR

/** Drop `uid` from `map` after {@link HANDLER_TTL_MS}. */
function expire(map: Map<string, unknown>, uid: string) {
  // unref: a pending expiry must not keep the process alive on shutdown.
  setTimeout(() => map.delete(uid), HANDLER_TTL_MS).unref()
}

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
  expire(buttonFns, uid)
  return uid
}

/** Return the UID of the function */
function setModal(fn: IRF<ModalSubmitInteraction>): string {
  const uid = getUid()
  modalFns.set(uid, fn)
  expire(modalFns, uid)
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

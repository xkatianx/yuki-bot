import { ButtonInteraction, ModalSubmitInteraction } from 'discord.js'
import { Err, Ok, Result } from '../../../misc/result.js'
import { IRF } from '../_main.js'
import { v4 as uuidv4 } from 'uuid'

export class InteractionHandler {
  static buttonFns: {
    [uid: string]: IRF<ButtonInteraction>
  } = {}

  static modalFns: {
    [uid: string]: IRF<ModalSubmitInteraction>
  } = {}

  static #getNewUid (): string {
    while (true) {
      const uid = uuidv4()
      if (uid in this.buttonFns) continue
      if (uid in this.modalFns) continue
      return uid
    }
  }

  /** Return the UID of the function */
  static setButton (fn: IRF<ButtonInteraction>): string {
    const uid = this.#getNewUid()
    this.buttonFns[uid] = fn
    return uid
  }

  /** Return the UID of the function */
  static setModal (fn: IRF<ModalSubmitInteraction>): string {
    const uid = this.#getNewUid()
    this.modalFns[uid] = fn
    return uid
  }

  static getButton (uid: string): Result<IRF<ButtonInteraction>, string> {
    const fn = this.buttonFns[uid]
    if (fn == null) return Err(`Function (UID=${uid}) does not exist.`)
    return Ok(fn)
  }

  static getModal (uid: string): Result<IRF<ModalSubmitInteraction>, string> {
    const fn = this.modalFns[uid]
    if (fn == null) return Err(`Function (UID=${uid}) does not exist.`)
    return Ok(fn)
  }
}

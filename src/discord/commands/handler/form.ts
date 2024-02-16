import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  Message,
  MessagePayload,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder
} from 'discord.js'
import { say } from '../../error.js'
import { IRF } from '../_main.js'
import { Err, Ok, Result } from '../../../misc/result.js'
import { InteractionHandler } from './interaction.js'
import { fatal } from '../../../misc/cli.js'

export class Form {
  #interaction?: ChatInputCommandInteraction<CacheType>
  #inputs: TextInputBuilder[] = []
  #text = ''
  #modal: ModalBuilder[] = []
  #buttons?: ActionRowBuilder<ButtonBuilder>
  private onSubmit?: (
    form: Form
  ) => Promise<string | MessagePayload | InteractionEditReplyOptions>
  #afterSubmit?: () => Promise<void>

  getModal (idx: number): ModalBuilder {
    if (this.#modal[idx] == null) {
      this.#modal[idx] = this.#newModal('(title)', idx)
    }
    return this.#modal[idx]
  }

  #newModal (title: string, idx: number): ModalBuilder {
    const fn: IRF<ModalSubmitInteraction> = async i => {
      await this.#editFromModal(i, idx)
      if (i.isFromMessage()) {
        await i.update({
          content: this.printToDiscord()
        })
      }
    }
    const uid = InteractionHandler.setModal(fn)

    return new ModalBuilder()
      .setCustomId(uid)
      .setTitle(title)
      .addComponents(
        ...this.#inputs
          .slice(idx * 5, idx * 5 + 5)
          .map(v => new ActionRowBuilder<TextInputBuilder>().addComponents(v))
      )
  }

  get buttons (): ActionRowBuilder<ButtonBuilder> {
    if (this.#buttons == null) {
      this.#buttons = this.#newButtons()
    }
    return this.#buttons
  }

  /** The returned string of `fn` will be the message showed after submit. */
  setOnSubmit (fn: Exclude<typeof this.onSubmit, undefined>): this {
    this.onSubmit = fn
    return this
  }

  /** The returned string of `fn` will be the message showed after submit. */
  setAfterSubmit (fn: () => Promise<void>): this {
    this.#afterSubmit = fn
    return this
  }

  #newButtons (): ActionRowBuilder<ButtonBuilder> {
    const edits = []
    for (let c = 0; c * 5 < this.#inputs.length; c++) {
      const onEdit: IRF<ButtonInteraction> = async i => {
        await i.showModal(this.getModal(c))
      }
      const uid = InteractionHandler.setButton(onEdit)
      const edit = new ButtonBuilder()
        .setCustomId(uid)
        .setLabel(`Edit ${c + 1}`)
        .setStyle(ButtonStyle.Secondary)
      edits.push(edit)
    }

    const onSubmit: IRF<ButtonInteraction> = async i => {
      await i.deferReply()
      await this.#interaction?.editReply({
        components: []
      })
      if (this.onSubmit == null) say('Missing submission function.')
      const str = await this.onSubmit(this)
      await i.editReply(str)
      await this.#afterSubmit?.()
    }
    const uid = InteractionHandler.setButton(onSubmit)
    const submit = new ButtonBuilder()
      .setCustomId(uid)
      .setLabel('Submit')
      .setStyle(ButtonStyle.Success)

    return new ActionRowBuilder<ButtonBuilder>().addComponents(...edits, submit)
  }

  async reply (
    interaction: ChatInputCommandInteraction<CacheType>
  ): Promise<Message<boolean>> {
    this.#interaction = interaction
    return await interaction.editReply({
      content: this.printToDiscord(),
      components: [this.buttons]
    })
  }

  setText (text: string): this {
    this.#text = text
    return this
  }

  addInput (input: TextInputBuilder): this {
    this.#inputs.push(input)
    return this
  }

  async #editFromModal (
    i: ModalSubmitInteraction,
    idx: number
  ): Promise<{ [key: string]: string | undefined }> {
    const res = this.#inputs.slice(idx * 5, idx * 5 + 5).map(msi => {
      const id = msi.data.custom_id
      if (id == null) fatal('Missing id in a modal.')
      const v = i.fields.getTextInputValue(id)
      const oldValue = msi.data.value ?? ''
      msi.setValue(v)
      return [id, oldValue]
    })
    return Object.fromEntries(res)
  }

  printToDiscord (): string {
    const props = this.#inputs
      .map(msi => {
        const key = msi.data.label ?? fatal('missing label in a modal')
        const value = msi.data.value ?? ''
        return `**${key}**\n${value}`
      })
      .join('\n')
    if (this.#text.length === 0) return props
    return `${this.#text}\n${props}`
  }

  get (id: string): Result<string, string> {
    const input = this.#inputs.find(input => input.data.custom_id === id)
    if (input == null) return Err(`'${id}' is not a valid key.`)
    return Ok(input.data.value ?? '')
  }
}

/* TODO
- Edit 1 -> Edit
- "cancel" button
*/

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  Message,
  MessagePayload,
  ModalSubmitInteraction,
} from "discord.js"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import { fatal } from "~misc/cli.js"
import type { Code, MyErrorBase } from "~util/error/index.js"
import { err, ok, result, type Result } from "~util/result/index.js"
import type { MaybeResult } from "~util/result/result/type.js"
import type { IRF } from "../commands/base.js"
import { BotError, BotErrorCode } from "../error.js"
import { InteractionHandler } from "./interaction.js"

export interface FormInputProps {
  customId: string
  label: string
  placeholder: string
  value?: string
  required?: boolean
}

const GROUP_SIZE = 5

export class Form {
  #interaction?: ChatInputCommandInteraction
  #inputs: TextInputBuilder[] = []
  #labels = new Map<TextInputBuilder, string>()
  #text = ""
  #modal: ModalBuilder[] = []
  #buttons?: ActionRowBuilder<ButtonBuilder>
  private onSubmit?: (
    form: Form
  ) => Promise<
    MaybeResult<
      string | MessagePayload | InteractionEditReplyOptions,
      MyErrorBase<Code>
    >
  >
  #afterSubmit?: () => Promise<void>

  getModal(idx: number): ModalBuilder {
    if (this.#modal[idx] == null) {
      this.#modal[idx] = this.#newModal("(title)", idx)
    }
    return this.#modal[idx]
  }

  #newModal(title: string, idx: number): ModalBuilder {
    const fn: IRF<ModalSubmitInteraction> = async (i) => {
      this.#editFromModal(i, idx)
      if (i.isFromMessage()) {
        await i.update({
          content: this.printToDiscord(),
        })
      }
    }
    const uid = InteractionHandler.setModal(fn)

    const inputs = this.#inputs.slice(
      idx * GROUP_SIZE,
      idx * GROUP_SIZE + GROUP_SIZE
    )
    const components = inputs.map((v) => {
      const label = this.#labels.get(v) ?? ""
      return {
        type: ComponentType.Label as const,
        label,
        component: v.toJSON(),
      } as const
    })

    return new ModalBuilder()
      .setCustomId(uid)
      .setTitle(title)
      .addLabelComponents(...components)
  }

  get buttons(): ActionRowBuilder<ButtonBuilder> {
    if (this.#buttons == null) {
      this.#buttons = this.#newButtons()
    }
    return this.#buttons
  }

  /**
   * The returned string of `fn` will be the message showed after submit.
   * Result<string> is also accepted.
   */
  setOnSubmit(fn: Exclude<typeof this.onSubmit, undefined>): this {
    this.onSubmit = fn
    return this
  }

  /** The returned string of `fn` will be the message showed after submit. */
  setAfterSubmit(fn: () => Promise<void>): this {
    this.#afterSubmit = fn
    return this
  }

  #newButtons(): ActionRowBuilder<ButtonBuilder> {
    const edits = []
    for (let c = 0; c * GROUP_SIZE < this.#inputs.length; c++) {
      const onEdit: IRF<ButtonInteraction> = async (i) => {
        await i.showModal(this.getModal(c))
      }
      const uid = InteractionHandler.setButton(onEdit)
      const edit = new ButtonBuilder()
        .setCustomId(uid)
        .setLabel(`Edit`)
        .setStyle(ButtonStyle.Secondary)
      edits.push(edit)
    }
    if (edits.length > 1)
      edits.forEach((edit, idx) => {
        edit.setLabel(`Edit ${(idx + 1).toString()}`)
      })

    const onSubmit: IRF<ButtonInteraction> = async (i) => {
      await i.deferReply()
      await this.#interaction?.editReply({
        components: [],
      })
      if (this.onSubmit == null)
        throw BotError.new(
          BotErrorCode.UNKNOWN_MODAL,
          "Missing submission function."
        )
      const res = await this.onSubmit(this)
      const str = result.isResult(res) ? res.unwrap() : res
      await i.editReply(str)
      await this.#afterSubmit?.()
    }
    const uid = InteractionHandler.setButton(onSubmit)
    const submit = new ButtonBuilder()
      .setCustomId(uid)
      .setLabel("Submit")
      .setStyle(ButtonStyle.Success)

    return new ActionRowBuilder<ButtonBuilder>().addComponents(...edits, submit)
  }

  async reply(interaction: ChatInputCommandInteraction): Promise<Message> {
    this.#interaction = interaction
    return await interaction.editReply({
      content: this.printToDiscord(),
      components: [this.buttons],
    })
  }

  setText(text: string): this {
    this.#text = text
    return this
  }

  addInput2(props: FormInputProps): this {
    const input = new TextInputBuilder()
      .setCustomId(props.customId)
      .setPlaceholder(props.placeholder)
      .setStyle(TextInputStyle.Short)
      .setValue(props.value ?? "")
      .setRequired(props.required ?? false)
    this.#labels.set(input, props.label)
    this.#inputs.push(input)
    return this
  }

  #editFromModal(
    i: ModalSubmitInteraction,
    idx: number
  ): Record<string, string | undefined> {
    const res = this.#inputs
      .slice(idx * GROUP_SIZE, idx * GROUP_SIZE + GROUP_SIZE)
      .map((msi) => {
        const id = msi.data.custom_id
        if (id == null) fatal("Missing id in a modal.")
        const v = i.fields.getTextInputValue(id)
        const oldValue = msi.data.value ?? ""
        msi.setValue(v)
        return [id, oldValue] as const
      })
    return Object.fromEntries(res)
  }

  printToDiscord(): string {
    const props = this.#inputs
      .map((msi) => {
        const key = this.#labels.get(msi) ?? fatal("missing label in a modal")
        const value = msi.data.value ?? ""
        return `**${key}**\n${value}`
      })
      .join("\n")
    if (this.#text.length === 0) return props
    return `${this.#text}\n${props}`
  }

  get(id: string): Result<string, string> {
    const input = this.#inputs.find((input) => input.data.custom_id === id)
    if (input == null) return err(`'${id}' is not a valid key.`)
    return ok(input.data.value ?? "")
  }
}

/* TODO
- Edit 1 -> Edit
- "cancel" button
*/

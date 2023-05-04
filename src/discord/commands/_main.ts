// Read https://discordjs.guide/slash-commands/advanced-creation.html
// for advanced usage.

import {
  ButtonInteraction,
  CacheType,
  ChatInputCommandInteraction,
  Interaction,
  ModalSubmitInteraction,
  SlashCommandBuilder
} from 'discord.js'
import { ELV, YukiError } from '../error.js'
import { fail } from '../../misc/cli.js'

// implement commands in their own files in the same folder,
// and import them here
import test from './test.js'
import stats from './stats.js'
import sheet from './sheet.js'
import puzzle from './puzzle.js'
import new_, {
  bEditPuzzlehunt,
  bCreatePuzzlehunt,
  mEditPuzzlehunt
} from './new.js'

/** interaction response function */
export type IRF<T extends Interaction> = (interaction: T) => Promise<void>

// also remember to export them here
export const MyCommands = {
  test,
  stats,
  sheet,
  puzzle,
  new: new_
}

export const MyIrfs: {
  button: Record<`b${string}`, IRF<ButtonInteraction>>
  model: Record<`m${string}`, IRF<ModalSubmitInteraction>>
} = {
  button: {
    bEditPuzzlehunt,
    bCreatePuzzlehunt
  },
  model: {
    mEditPuzzlehunt
  }
}

export interface CommandObj {
  data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<any>
}

export function newSlashCommand (
  name: string,
  desc: string,
  execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<any>
): CommandObj {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(desc),
    execute
  }
}

/** This is called when a slash command has some error and fails to reply
 * to the user, this function will reply to the user instead.
 */
export async function errorHandler (
  interaction: Interaction,
  e: Error
): Promise<void> {
  let content = 'There was an error while executing this command!'
  if (e instanceof YukiError && e.level === ELV.SAY) content = e.message
  else fail(e)
  if (
    interaction.isChatInputCommand() ||
    interaction.isButton() ||
    interaction.isModalSubmit()
  ) {
    try {
      await interaction.reply(content)
    } catch (_) {
      await interaction.editReply(content)
    }
  }
}

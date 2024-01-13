// Read https://discordjs.guide/slash-commands/advanced-creation.html
// for advanced usage.

import {
  CacheType,
  ChatInputCommandInteraction,
  Interaction,
  SlashCommandBuilder
} from 'discord.js'
import { ELV, YukiError } from '../error.js'
import { fail } from '../../misc/cli.js'

// implement commands in their own files in the same folder,
// and import them here
import test from './test.js'
import root from './root.js'
import round from './round.js'
import stats from './stats.js'
import sheet from './sheet.js'
import puzzle from './puzzle.js'
import new_ from './new.js'
import add from './add.js'
import login from './login.js'
import setting, {
  bSettingGoogle,
  bSettingRegister,
  mSettingGoogle,
  mSettingRegister
} from './setting.js'

/** interaction response function */
export type IRF<T extends Interaction> = (interaction: T) => Promise<void>

// also remember to export them here
export const MyCommands = {
  test,
  stats,
  root,
  round,
  sheet,
  puzzle,
  new: new_,
  add,
  login,
  setting
}

export const MyIrfs = {
  command: {},
  button: {
    bSettingRegister,
    bSettingGoogle
  },
  modal: {
    mSettingRegister,
    mSettingGoogle
  }
}

export interface CommandObj {
  data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  execute: IRF<ChatInputCommandInteraction>
}

// declare module 'discord.js' {
//   interface ButtonBuilder {
//     setCustomId: (customId: keyof typeof MyIrfs.button) => this
//   }
//   interface ModalBuilder {
//     setCustomId: (customId: keyof typeof MyIrfs.modal) => this
//   }
// }

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

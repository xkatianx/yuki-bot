// Read https://discordjs.guide/slash-commands/advanced-creation.html
// for advanced usage.

import {
  ChatInputCommandInteraction,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { ELV, YukiError } from "../error.js";
import { fail } from "../../misc/cli.js";

// implement commands in their own files in the same folder,
// and import them here
import test from "./test.js";
import root from "./root.js";
import round from "./round.js";
import new_ from "./new.js";
import puzzle from "./puzzle.js";
import login from "./login.js";

// also remember to export them here
export const MyCommands = {
  test,
  root,
  round,
  new: new_,
  puzzle,
  login,
};

/** interaction response function */
export type IRF<T extends Interaction> = (interaction: T) => Promise<void>;

export interface CommandObj {
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: IRF<ChatInputCommandInteraction>;
}

/** This is called when a slash command has some error and fails to reply
 * to the user, this function will reply to the user instead.
 */
export async function errorHandler(
  interaction: Interaction,
  e: unknown
): Promise<void> {
  let content = "There was an error while executing this command!";
  if (e instanceof YukiError && e.level === ELV.SAY) content = e.message;
  else fail(e);
  if (
    interaction.isChatInputCommand() ||
    interaction.isButton() ||
    interaction.isModalSubmit()
  ) {
    try {
      await interaction.reply(content);
    } catch (_) {
      await interaction.editReply(content);
    }
  }
}
/* TODO
- error handler
*/

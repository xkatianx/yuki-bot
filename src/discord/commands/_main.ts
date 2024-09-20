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
import settings from "./settings.js";

// also remember to export them here
export const MyCommands = {
  test,
  root,
  round,
  new: new_,
  puzzle,
  login,
  settings,
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
  let ephemeral = false;
  if (e instanceof YukiError) {
    switch (e.level) {
      case ELV.LOG:
        // TODO
        break;
      case ELV.PSS:
        ephemeral = true;
      // fallthrough
      case ELV.SAY:
        content = e.message;
        break;
      default:
        fail(e);
    }
  } else fail(e);

  if (
    interaction.isChatInputCommand() ||
    interaction.isButton() ||
    interaction.isModalSubmit()
  ) {
    try {
      await interaction.reply({ content, ephemeral });
    } catch (_) {
      await interaction.editReply(content);
    }
  }
}

/* TODO
- error handler
*/

/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { IRF } from "./_main.js";
import { fetchTextChannel, interactionFetch } from "./_misc.js";

const data = new SlashCommandBuilder()
  .setName("test") // command here, should be the same as the filename
  .setDescription(
    // description here
    "This is a test slash command. This may do anything."
  )
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("The url of the puzzle.")
      .setRequired(true)
  );

const execute: IRF<ChatInputCommandInteraction> = async (i) => {
  const { bot, guild } = interactionFetch(i);
  const channel = fetchTextChannel(i);
  await i.reply("Hello!");
};

export default { data, execute };

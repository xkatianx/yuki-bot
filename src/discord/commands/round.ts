import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { say } from "../error.js";
import { fetchTextChannel, interactionFetch } from "./_misc.js";

const data = new SlashCommandBuilder()
  .setName("round") // command here, should be the same as the file name
  .setDescription("Add a new round title in the spreadsheet INDEX.")
  .addStringOption((option) =>
    option
      .setName("title")
      .setDescription("The round title to append.")
      .setRequired(true)
  );

async function execute(
  i: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const { bot } = interactionFetch(i);
  const channel = fetchTextChannel(i);
  await i.deferReply();
  const title = i.options.getString("title") ?? "";
  if (title === "") say("You have to input a non-empty title.");
  const cm = (await bot.getChannelManager(channel)).unwrapOrElse(say);
  await cm.appendRound(title);
  await i.editReply(`Round \`${title}\` added.`);
}

export default { data, execute };

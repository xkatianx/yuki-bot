import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { IRF } from "./_main.js";
import { fetchTextChannel, interactionFetch } from "./_misc.js";
import { getPinned } from "../util/pin.js";
import { formatString } from "../../misc/format.js";
import { prepareRoot } from "../yuki/root.js";

const data = new SlashCommandBuilder()
  .setName("init") // command here, should be the same as the filename
  .setDescription(
    // description here
    "Initialize Yuki settings for this guild. This command is owner-only."
  )
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("The url of the root Google drive folder.")
      .setRequired(true)
  );

const execute: IRF<ChatInputCommandInteraction> = async (i) => {
  const { bot, guild } = interactionFetch(i);
  const channel = fetchTextChannel(i);
  if (i.user.id !== guild.ownerId) bot.pss("This command is owner-only.");
  const rootUrl = i.options.getString("url")!;

  await i.deferReply({ ephemeral: true });
  const res1 = await prepareRoot(rootUrl);
  if (res1.isErr()) bot.pss(res1.error);
  const { root, settings } = res1.unwrap();
  const res2 = await settings.setGuildInfo({
    guildId: guild.id,
    guildName: guild.name,
    announcingChannelID: channel.id,
    loggingChannelID: channel.id,
  });
  if (res2.isErr()) bot.pss(res2.error);

  const format = "Root folder: {}";
  await Promise.all(
    (await getPinned(bot, guild, format)).map((m) => m.unpin())
  );
  await i.editReply("Success.");
  const m = await i.followUp(formatString(format, [root.url]));
  await channel.messages.pin(m);
};

export default { data, execute };

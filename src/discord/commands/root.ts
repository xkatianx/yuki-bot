import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { say } from "../error.js";
import { interactionFetch } from "./_misc.js";
import { rootFolderMessage } from "../yuki/root.js";
import { IRF } from "./_main.js";
import { GDriveErrorCode } from "../../google/error.js";

const data = new SlashCommandBuilder()
  .setName("root") // command here, should be the same as the file name
  .setDescription(
    "Get/Set the root Google drive folder for the current discord guild. " +
      "This command is owner-only."
  )
  .addStringOption((option) =>
    option.setName("url").setDescription("The url of the Google drive folder.")
  );

const execute: IRF<ChatInputCommandInteraction> = async (i) => {
  const { bot, channel, guild } = interactionFetch(i);
  await i.deferReply();
  if (i.user.id !== guild.ownerId) say("This command is owner-only.");

  const oldRoot = await bot.getRootFolder(guild);
  const newRootUrl = i.options.getString("url");
  if (newRootUrl == null) {
    oldRoot
      .map((folder) => say(`The root folder for this server:\n${folder.url}`))
      .mapErr((e) => {
        switch (e.code) {
          case GDriveErrorCode.CANNOT_WRITE:
            say(
              `Error: ${e.message}\n` +
                "Please give me the write permission to the root folder."
            );
            break;
          default:
            say(
              "The root folder is not set yet. " +
                "Please use `/root {url}` to set one."
            );
        }
      });
  } else {
    // set root folder url by pinning certain message
    const reply = rootFolderMessage(newRootUrl);
    const m = await i.editReply(reply);
    await channel.messages.pin(m);
  }
};

export default { data, execute };

/* TODO
- deal with the case when set but old exists
- follows to ask default name/pw and create settings
*/

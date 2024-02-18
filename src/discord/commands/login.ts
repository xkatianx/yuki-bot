import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { say } from "../error.js";
import { fetchTextChannel, interactionFetch } from "./_misc.js";
import { Form } from "./handler/form.js";

const data = new SlashCommandBuilder()
  .setName("login") // command here, should be the same as the filename
  .setDescription("Use this when the bot failed to auto-login."); // description here

async function execute(
  i: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const { bot } = interactionFetch(i);
  const channel = fetchTextChannel(i);
  // const { bot, channel, guild } = interactionFetch(interaction)
  await i.deferReply();

  const cm = (await bot.getChannelManager(channel)).unwrapOrElse(say);
  const { username, password } = (await cm.getLoginInfo()).unwrapOr({
    username: "",
    password: "",
  });

  const form = new Form()
    .addInput(
      new TextInputBuilder()
        .setCustomId("url")
        .setLabel("URL")
        .setPlaceholder("The url of the login page")
        .setStyle(TextInputStyle.Short)
        .setValue("")
        .setRequired(true)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId("username")
        .setLabel("USERNAME")
        .setPlaceholder("The username to login to the puzzlehunt")
        .setStyle(TextInputStyle.Short)
        .setValue(username)
        .setRequired(true)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId("password")
        .setLabel("PASSWORD")
        .setPlaceholder("The password to login to the puzzlehunt")
        .setStyle(TextInputStyle.Short)
        .setValue(password)
        .setRequired(true)
    )
    .setOnSubmit(async (form: Form) => {
      const args = {
        url: form.get("url").unwrap(),
        username: form.get("username").unwrap(),
        password: form.get("password").unwrap(),
      };
      const res = await cm.login(args.username, args.password, args.url);
      return res.isOk() ? "done" : res.error.message;
    });

  await form.reply(i);
}

export default { data, execute };

/* TODO
- make setOnSubmit accept Result
*/

import { AsyncResult, result } from "always-panic"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { displayCode } from "~misc/format.js"
import { Form } from "~util/discord/util/form.js"
import { YukiBaseCommand } from "./_base.js"

class LoginCommand extends YukiBaseCommand {
  buildData() {
    return new SlashCommandBuilder()
      .setName("login")
      .setDescription("Use this when the bot failed to auto-login.")
  }

  execute(interaction: ChatInputCommandInteraction) {
    return AsyncResult.from(
      result.all([
        this.getContext(interaction),
        this.getTextChannel(interaction),
      ])
    )
      .andThen(async ([{ bot }, channel]) => {
        await this.deferReply(interaction)
        return await bot.getChannelManager(channel)
      })
      .mapErr((e) => this.handleError(e))
      .map(async (cm) => {
        const { website, username, password } = (
          await cm.spreadsheet.readIndexInfo()
        ).unwrapOr({
          website: "",
          username: "",
          password: "",
        })

        const form = new Form()
          .addInput2({
            customId: "url",
            label: "URL",
            placeholder: "The url of the login page",
            value: website,
            required: true,
          })
          .addInput2({
            customId: "username",
            label: "USERNAME",
            placeholder: "The username to login to the puzzlehunt",
            value: username,
            required: true,
          })
          .addInput2({
            customId: "password",
            label: "PASSWORD",
            placeholder: "The password to login to the puzzlehunt",
            value: password,
            required: true,
          })
          .setOnSubmit(async (form: Form) => {
            const args = {
              url: form.get("url").unwrap(),
              username: form.get("username").unwrap(),
              password: form.get("password").unwrap(),
            }
            return (
              await cm.browser.login(args.username, args.password, args.url)
            )
              .map(
                () =>
                  `Logged in as ${displayCode(args.username)} to <${args.url}>.`
              )
              .mapErr((e) => this.handleError(e))
          })

        await form.reply(interaction)
      })
  }
}

export default new LoginCommand()

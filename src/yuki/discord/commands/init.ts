// import type { ChatInputCommandInteraction } from "discord.js"
// import { SlashCommandBuilder } from "discord.js"
// import { formatString } from "~misc/format.js"
// import { BaseCommand } from "../../discord/commands/base.js"
// import { getPinned, PinFormat } from "../../discord/util/pin.js"
// import { say } from "../error.js"
// import { prepareRoot } from "../root/root.js"

// class InitCommand extends BaseCommand {
//   buildData() {
//     return new SlashCommandBuilder()
//       .setName("init") // command here, should be the same as the filename
//       .setDescription(
//         // description here
//         "Initialize Yuki settings for this guild. This command is owner-only."
//       )
//       .addStringOption((option) =>
//         option
//           .setName("url")
//           .setDescription("The url of the root Google drive folder.")
//           .setRequired(true)
//       )
//   }

//   async execute(interaction: ChatInputCommandInteraction) {
//     const { bot, guild } = this.getContext(interaction)
//     const channel = this.getTextChannel(interaction)
//     if (interaction.user.id !== guild.ownerId)
//       bot.pss("This command is owner-only.")
//     const rootUrl =
//       interaction.options.getString("url") ??
//       say("Usage: `/init <url>`. Please enter a url.")

//     await interaction.deferReply({ ephemeral: true })
//     const res1 = await prepareRoot(rootUrl)
//     if (res1.isErr()) bot.pss(res1.error)
//     const { root, settings } = res1.unwrap()
//     const res2 = await settings.setGuildInfo({
//       guildId: guild.id,
//       guildName: guild.name,
//       announcingChannelID: channel.id,
//       loggingChannelID: channel.id,
//     })
//     if (res2.isErr()) bot.pss(res2.error)

//     const format = PinFormat.Root
//     await Promise.all(
//       (await getPinned(guild, bot, format)).map((m) => m.unpin())
//     )
//     await interaction.editReply("Success.")
//     const m = await interaction.followUp(
//       formatString(format, { url: root.url })
//     )
//     await channel.messages.pin(m)
//   }
// }

// export default new InitCommand()

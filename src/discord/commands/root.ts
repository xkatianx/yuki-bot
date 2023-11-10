import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from 'discord.js'
import { say } from '../error.js'
import { interactionFetch } from './_misc.js'
import { getRootFolder, setRootFolder } from '../yuki/root.js'

const data = new SlashCommandBuilder()
  .setName('root') // command here, should be the same as the file name
  .setDescription(
    'Get/Set the root Google drive folder for the current discord server.'
  )
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('The new url of the Google drive folder.')
  )

async function execute (
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const { bot, channel, guild } = interactionFetch(interaction)
  await interaction.deferReply()
  if (interaction.user.id !== guild.ownerId) say('This command is owner-only.')

  const oldRoot = await getRootFolder(bot, guild)
  const newRoot = interaction.options.getString('url')
  if (newRoot == null) {
    oldRoot
      .map(folder => say(`The root folder for this server:\n${folder.url}`))
      .mapErr(_ =>
        say(
          'The root folder is not set yet. Please use `/root {url}` to set one.'
        )
      )
  } else {
    const reply = await setRootFolder(bot, guild, newRoot)
    const m = await interaction.editReply(reply)
    await channel.messages.pin(m)
  }
}

export default { data, execute }

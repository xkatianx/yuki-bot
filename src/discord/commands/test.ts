import { info } from '../../misc/cli.js'
import { newSlashCommand } from './_main.js'

export default newSlashCommand(
  'test', // command here, should be the same as the filename
  'This is a test slash command. This may do anything.', // description here
  async interaction => {
    // code here
    const bot = interaction.client.mybot
    const guild = interaction.guild
    await interaction.reply('Hello!')
  }
)

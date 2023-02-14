import { newSlashCommand } from './_main.js'

export default newSlashCommand(
  'test', // command here, should be the same as the filename
  'This is a test slash command. This may do anything.', // description here
  async interaction => {
    // code here
    await interaction.reply('Hello!')
  }
)

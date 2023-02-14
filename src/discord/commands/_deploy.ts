import { REST, Routes } from 'discord.js'
import { done, fail } from '../../misc/cli.js'
import { env } from '../../misc/env.js'
import { MyCommands } from './_main.js'

const token = env.DC.TOKEN
const clientId = env.DC.ID
const guildId = env.DC.GID

const routes = (guildId == null)
  ? Routes.applicationCommands(clientId) // for all guilds
  : Routes.applicationGuildCommands(clientId, guildId) // for 1 guild

const commands = Object.values(MyCommands).map(v => v.data.toJSON())

new REST({ version: '10' })
  .setToken(token)
  .put(routes, { body: commands })
  .then(() => {
    done('Successfully reloaded application (/) commands.')
  }).catch(fail)

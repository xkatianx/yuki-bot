import { Guild, GuildBasedChannel, Message, ChannelType } from 'discord.js'
import { Bot } from '../bot.js'
import { GFolder } from '../../gsheet/folder.js'
import { Err, Ok, Result } from '../../misc/result.js'
// import { GSpreadsheet } from '../../gsheet/gsheet.js'

enum PinFormat {
  Root = 'Root folder: {}'
}
function setPinArgument (args: string[], format: PinFormat): string {
  let str: string = format
  args.forEach(arg => {
    str = str.replace('{}', arg)
  })
  return str
}
function getPinArgument (
  message: string,
  format: PinFormat
): Result<string, string> {
  const re = new RegExp('^' + format.replace('{}', '(.*?)') + '$')
  const res = message.match(re)
  if (res == null) return Err(message)
  return Ok(res[1])
}
function isPinFormat (message: Message, format: PinFormat): boolean {
  const res = getPinArgument(message.content, format)
  return res.ok
}

async function getPinned (
  bot: Bot,
  guildOrChannel: Guild | GuildBasedChannel,
  search?: PinFormat
): Promise<Message[]> {
  let channels: GuildBasedChannel[]
  if (guildOrChannel instanceof Guild) {
    channels = [...guildOrChannel.channels.cache.values()]
  } else {
    channels = [guildOrChannel]
  }

  const pss = channels.map(async channel => {
    if (channel.type === ChannelType.GuildText) {
      try {
        const pinned = await channel.messages.fetchPinned(true)
        return [...pinned.values()]
      } catch (_) {
        return null
      }
    } else return null
  })
  const results = (await Promise.all(pss))
    .flat()
    .filter((v): v is Message<true> => v != null)
    .filter(
      v =>
        search == null ||
        (v.author.id === bot.client.user?.id && isPinFormat(v, search))
    )
  return results
}

export async function getRootFolder (
  bot: Bot,
  guild: Guild
): Promise<Result<GFolder, string>> {
  const message = await getPinned(bot, guild, PinFormat.Root)
  if (message.length === 0) return Err('Root is not set yet.')
  const root = getPinArgument(message[0].content, PinFormat.Root)
  if (root.err) return root
  const url = root.unwrap()
  const folder = GFolder.fromUrl(url)
  const valid = await folder.checkWritePermission()
  if (valid.err) return Err('Invalid root.')
  return Ok(folder)
}

export async function setRootFolder (
  bot: Bot,
  guild: Guild,
  url: string
): Promise<string> {
  const folder = GFolder.fromUrl(url)
  // check valid
  const valid = await folder.checkWritePermission()
  if (valid.err) {
    return 'The url is not valid or I do not have write permission to the folder.'
  }
  // remove old
  await removeRootFolder(bot, guild)

  // set new

  // read setting (set setting)
  // let settings: Result<GSpreadsheet, any> = await folder.findSpreadSheet('settings')
  // if (settings.err) {
  //   settings = await GSpreadsheet.template.settings.copyTo(folder, 'settings')
  // }

  // return reply
  return setPinArgument([url], PinFormat.Root)
}

// async function getSetting (bot: Bot, guild: Guild) {
//   const root = await getRootFolder(bot, guild)
// }

async function removeRootFolder (bot: Bot, guild: Guild): Promise<void> {
  const messages = await getPinned(bot, guild, PinFormat.Root)
  await Promise.all(messages.map(async m => await m.delete()))
}

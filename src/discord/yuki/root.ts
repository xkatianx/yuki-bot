import { Guild, GuildBasedChannel, Message, ChannelType } from 'discord.js'
import { Bot } from '../bot.js'
import { GFolder } from '../../gsheet/folder.js'
import { Err, Ok, Result } from '../../misc/result.js'
import { Code, MyError, MyErrorCode, uid } from '../../error.js'
import { GDriveError, GDriveErrorCode } from '../../gsheet/error.js'

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

function getPinArgument (message: string, format: PinFormat) {
  const re = new RegExp('^' + format.replaceAll('{}', '(.*?)') + '$')
  return message.match(re)
}

function isPinFormat (message: Message, format: PinFormat): boolean {
  const res = getPinArgument(message.content, format)
  return res != null
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
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
  return results
}

export async function getRootFolderUrl (bot: Bot, guild: Guild) {
  const lastMessage = (await getPinned(bot, guild, PinFormat.Root)).at(-1)
  if (lastMessage == null)
    return Err(
      RootError.new(
        RootErrorCode.MISSING_URL,
        `Unable to find root url in ${guild}.`
      )
    )
  const url = getPinArgument(lastMessage.content, PinFormat.Root)?.at(1)
  if (url == null)
    return Err(
      MyError.unexpected(
        'Wrong root url format in discord pinned message.',
        lastMessage
      )
    )
  return Ok(url)
}

export async function getRootFolder (
  bot: Bot,
  guild: Guild
): Promise<
  Result<
    GFolder,
    | MyError<MyErrorCode>
    | GDriveError<GDriveErrorCode.INVALID_URL>
    | GDriveError<GDriveErrorCode.CANNOT_WRITE>
    | RootError<RootErrorCode.MISSING_URL>
  >
> {
  return (await getRootFolderUrl(bot, guild)).andThenAsync(async url =>
    (
      await GFolder.fromUrl(url).andThenAsync(folder =>
        folder.checkWritePermission()
      )
    ).mapErr(e => e)
  )
}

export function rootFolderMessage (
  url: string
): string {
  // const res1 = GFolder.fromUrl(url)
  // if (res1.isErr()) return res1
  // const folder = res1.unwrap()
  // check valid
  // const valid = await folder.checkWritePermission()
  // if (valid.isErr()) {
    // return 'The url is not valid or I do not have write permission to the folder.'
  // }
  // remove old
  // await removeRootFolder(bot, guild)

  // set new

  // read setting (set setting)
  // let settings: Result<GSpreadsheet, any> = await folder.findSpreadSheet('settings')
  // if (settings.isErr()) {
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

export enum RootErrorCode {
  MISSING_URL = uid()
}

export class RootError<T extends Code> extends MyError<T> {
  private constructor (code: T, message: string) {
    super(code, message)
    this.name = 'RootError'
  }

  static new<T extends RootErrorCode> (code: T, message: string): RootError<T> {
    return new RootError(code, message)
  }
}

/* memo
Here I simply pin "Root folder: {url}" is any discord channel.
*/

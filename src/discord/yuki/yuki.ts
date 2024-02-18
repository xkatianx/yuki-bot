import { Guild, TextChannel } from "discord.js";
import { Bot } from "../bot.js";
import { asResult } from "../../misc/result.js";
import { GFolder } from "../../google/folder.js";
import { getRootFolder } from "./root.js";
import { Cache } from "../../misc/cache.js";
import { Settings, getSettings } from "./settings.js";

declare module "discord.js" {
  export interface Client {
    mybot: Yuki;
  }
}

export class Yuki extends Bot {
  roots = new Cache<GFolder>();
  settings = new Cache<Settings>();

  constructor(token: string) {
    super(token);
    this.client.mybot = this;
  }

  async getRootFolder(guild: Guild) {
    return await this.roots.getOrSet(
      guild.id,
      getRootFolder.bind(null, this, guild)
    );
  }

  async getSettings(guild: Guild) {
    return await this.settings.getOrSet(
      guild.id,
      getSettings.bind(this, guild)
    );
  }

  async getChannelManager(channel: TextChannel) {
    return asResult(
      await (
        await this.getSettings(channel.guild)
      ).andThenAsync((settings) => settings.getChannelManager(channel))
    );
  }

  async scanTitle(channel: TextChannel, url: string) {
    return (await this.getChannelManager(channel)).andThenAsync((cm) =>
      cm.scanTitle(url)
    );
  }

  // async appendPuzzle (
  //   channel: TextBasedChannel,
  //   url: string,
  //   tabName: string
  // ): Promise<string> {
  //   const ss = this.#channelThings[channel.id].spreadsheet
  //   await ss.newPuzzleTab(url, tabName)
  //   return tabName
  // }

  // setPuzzlehunt (channel: string, puzzlehunt: Puzzlehunt): void {
  //   this.puzzlehunts[channel] = puzzlehunt
  // }

  // getPuzzlehunt (channel: Channel): Puzzlehunt | undefined {
  //   return this.puzzlehunts[channel.id]
  // }

  // async getPuzzlehuntFromSheet (
  //   channel: Channel,
  //   errIfEmpty: true
  // ): Promise<Puzzlehunt>
  // async getPuzzlehuntFromSheet (
  //   channel: Channel,
  //   errIfEmpty = false
  // ): Promise<Puzzlehunt | undefined> {
  //   if (this.puzzlehunts[channel.id] == null) {
  //     const sheet = await this.getSheet(channel)
  //     if (sheet != null) {
  //       const ph = (await Puzzlehunt.from(sheet))
  //         .mapErr(_ => say('Failed to access to the spreadsheet.'))
  //         .unwrap()
  //       this.puzzlehunts[channel.id] = ph
  //     }
  //   }
  //   if (errIfEmpty && this.puzzlehunts[channel.id] == null) {
  //     say('Puzzlehunt has not been set. Please use `/new` first.')
  //   }
  //   return this.puzzlehunts[channel.id]
  // }
}

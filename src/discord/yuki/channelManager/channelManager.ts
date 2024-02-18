import { GFolder } from "../../../google/folder.js";
import { GSpreadsheet } from "../../../google/spreadsheet.js";
import { asResult } from "../../../misc/result.js";
import { Browser } from "./browser.js";
import { getLoginInfo, tryLogin } from "./login.js";

export class ChannelManager {
  folder: GFolder;
  spreadsheet: GSpreadsheet;
  protected browser?: Browser;

  constructor(folder: GFolder, spreadsheet: GSpreadsheet) {
    this.folder = folder;
    this.spreadsheet = spreadsheet;
  }

  toString(): string {
    return "TODO (a channel manager)";
  }

  getBrowser(url: string) {
    if (this.browser == null) this.browser = new Browser(url);
    return this.browser;
  }

  async browse(url: string) {
    return await this.getBrowser(url).browse(url);
  }

  getLoginInfo = getLoginInfo;
  tryLogin = tryLogin;

  async login(username: string, password: string, url: string) {
    return await this.getBrowser(url).login(username, password, url);
  }

  async scanTitle(url: string) {
    await this.tryLogin();
    return asResult(
      await (
        await this.browse(url)
      ).andThenAsync(async (browser) => await browser.getTitle())
    );
  }

  async appendRound(title: string) {
    return await this.spreadsheet.newRound(title);
  }
  async appendPuzzle(url: string, title: string) {
    return await this.spreadsheet.newPuzzleTab(url, title);
  }
}
/* TODO
- do more checks when scan title
*/

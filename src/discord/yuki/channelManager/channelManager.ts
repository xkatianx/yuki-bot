import { MyError, MyErrorCode } from '../../../error.js'
import { GFolder } from '../../../gsheet/folder.js'
import { GSpreadsheet } from '../../../gsheet/gsheet.js'
import { Result } from '../../../misc/result.js'
import { Browser, BrowserError, BrowserErrorCode } from './browser.js'
import { LoginError, LoginErrorCode, getLoginInfo, tryLogin } from './login.js'

export class ChannelManager {
  folder: GFolder
  spreadsheet: GSpreadsheet
  protected browser?: Browser

  constructor (folder: GFolder, spreadsheet: GSpreadsheet) {
    this.folder = folder
    this.spreadsheet = spreadsheet
  }

  toString (): string {
    return 'TODO (a channel manager)'
  }

  getBrowser (url: string) {
    if (this.browser == null) this.browser = new Browser(url)
    return this.browser
  }

  async browse (url: string) {
    return await this.getBrowser(url).browse(url)
  }

  getLoginInfo = getLoginInfo
  tryLogin = tryLogin

  async login (username: string, password: string, url: string) {
    return await this.getBrowser(url).login(username, password, url)
  }

  async scanTitle (
    url: string
  ): Promise<
    Result<
      string,
      | MyError<MyErrorCode>
      | BrowserError<
          | BrowserErrorCode.MISSING_PAGE
          | BrowserErrorCode.INPUT_NOT_FOUND
          | BrowserErrorCode.SUBMIT_NOT_FOUND
        >
      | LoginError<
          LoginErrorCode.MISSING_SPREADSHEET | LoginErrorCode.MISSING_LOGIN_INFO
        >
    >
  > {
    const res = await this.tryLogin()
    if (res.isErr() && res.error.code in LoginErrorCode)
      return (await this.browse(url)).andThenAsync(
        async browser => await browser.getTitle()
      )
    //@ts-ignore
    else return res
  }

  async appendRound (title: string) {
    return await this.spreadsheet.newRound(title)
  }
  async appendPuzzle (url: string, title: string) {
    return await this.spreadsheet.newPuzzleTab(url, title)
  }
}

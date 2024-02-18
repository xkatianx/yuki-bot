import { Code, MyError, uid } from "../../../error.js";
import { Ok, Err, asResultFn } from "../../../misc/result.js";
import { ChannelManager } from "./channelManager.js";

export async function tryLogin(this: ChannelManager) {
  return asResultFn(async () =>
    (await this.getLoginInfo()).andThenAsync((info) => {
      const url = new URL("/login", info.website).href;
      return this.getBrowser(url).login(info.username, info.password, url);
    })
  );
}

export async function getLoginInfo(this: ChannelManager) {
  const spreadsheet = this.spreadsheet;
  if (spreadsheet == null)
    return Err(
      LoginError.new(
        LoginErrorCode.MISSING_SPREADSHEET,
        `The spreadhseet is undefined in ${this}`
      )
    );
  const res = await spreadsheet.readRanges(["website", "username", "password"]);
  const website = String(res.at(0)?.values?.at(0)?.at(0) ?? "");
  const username = String(res.at(1)?.values?.at(0)?.at(0) ?? "");
  const password = String(res.at(2)?.values?.at(0)?.at(0) ?? "");
  const info = { website, username, password };
  if (website === "" || username === "" || password === "")
    return Err(
      LoginError.new(
        LoginErrorCode.MISSING_LOGIN_INFO,
        `Missing login info in ${info}`
      )
    );
  return Ok(info);
}

export enum LoginErrorCode {
  MISSING_SPREADSHEET = uid(),
  MISSING_LOGIN_INFO = uid(),
  ALREADY_LOGIN = uid(),
}

export class LoginError<T extends Code> extends MyError<T> {
  private constructor(code: T, message: string) {
    super(code, message);
    this.name = "LoginError";
  }

  static new<T extends LoginErrorCode>(
    code: T,
    message: string
  ): LoginError<T> {
    return new LoginError(code, message);
  }
}

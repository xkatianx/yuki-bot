import {
  Err,
  Ok,
} from "~/misc/result.js";

import {
  SettingSheetError,
  SettingSheetErrorCode,
} from "./sheet/error.js";
import { GSpreadsheet } from "./sheet/index.js";

type GuildInfo = {
  guildId: string;
  guildName: string;
  defaultUsername: string;
  defaultPassword: string;
  announcingChannelID: string;
  loggingChannelID: string;
};

export class SettingSheet extends GSpreadsheet {
  static from(spreadsheet: GSpreadsheet) {
    return new SettingSheet(spreadsheet.id);
  }

  async getVersion() {
    return (await this.readRange("version"))[0][0] as string;
  }

  async setGuildInfo(info: Partial<GuildInfo>) {
    const ver = await this.getVersion();
    switch (ver) {
      case "1.0.0":
        Object.entries(info)
          .filter((kv) => kv[1] != null)
          .forEach(([k, v]) => {
            this.writeCell(k, v);
          });
        await this.flushWrite();
        break;
      default:
        return Err(
          SettingSheetError.new(
            SettingSheetErrorCode.UNKNOWN_VERSION,
            `Unknown version: ${ver}`,
          ),
        );
    }
    return Ok(this);
  }
}

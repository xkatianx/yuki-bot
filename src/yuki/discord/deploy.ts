import { done, fail } from "~misc/cli.js"
import { env } from "~misc/env.js"
import { deployCommands } from "~util/discord/commands/deploy.js"
import * as YukiCommands from "./commands.js"

;(
  await deployCommands(
    Object.values(YukiCommands).map((v) => v.default),
    env.DC.TOKEN,
    env.DC.ID,
    env.DC.GID
  )
    .map(() => done("Successfully reloaded application (/) commands."))
    .mapErr(fail)
).unwrap()

import { fail } from "~misc/cli.js"
import { env } from "~misc/env.js"
import { Yuki } from "./yuki/yuki.js"

;(await new Yuki(env.DC.TOKEN).login())
  .inspectErr(() => {
    fail("Failed to login discord bot")
  })
  .unwrap()

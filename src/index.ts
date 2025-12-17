import { env } from "~misc/env.js"
import { Yuki } from "./yuki/yuki.js"

new Yuki(env.DC.TOKEN).login()

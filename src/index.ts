import { Yuki } from "./discord/yuki/yuki.js";
import { env } from "./misc/env.js";

new Yuki(env.DC.TOKEN).login();

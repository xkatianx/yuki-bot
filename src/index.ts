import { Yuki } from "./discord/yuki/yuki.js";
import { env } from "./misc/env.js";
import { polyfill } from "./polyfill.js";

polyfill();
new Yuki(env.DC.TOKEN).login();

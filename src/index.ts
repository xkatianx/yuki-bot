import { polyfill } from "./polyfill.js";
import { Yuki } from "./discord/yuki/yuki.js";
import { env } from "./misc/env.js";

polyfill();
new Yuki(env.DC.TOKEN).login();

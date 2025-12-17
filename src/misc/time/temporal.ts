import type { Temporal } from "@js-temporal/polyfill"
import { toTemporalInstant } from "@js-temporal/polyfill"
export { Intl, Temporal } from "@js-temporal/polyfill"

declare global {
  interface Date {
    toTemporalInstant(): Temporal.Instant
  }
}
Date.prototype.toTemporalInstant = toTemporalInstant

import { Temporal } from "./temporal.js"

/**
 * Get the current year and month in the format of 'YYYY/MM'.
 * @returns the current year and month in the format of 'YYYY/MM'.
 * example output: '2022/09'
 */
export function YYYY$MM() {
  const today = Temporal.Now.plainDateISO()
  return `${today.year.toString()}/${String(today.month).padStart(2, "0")}`
}

/** current time in Taiwan. example output: '2022/9/5 下午2:40:00' */
export function twNow(): string {
  const now = Temporal.Now.plainDateTimeISO("Asia/Taipei")
  return now.toLocaleString("zh-tw")
}

/** current time in Japan. example output: '2022/9/5 15:40:00' */
export function jpNow(): string {
  const now = Temporal.Now.plainDateTimeISO("Asia/Tokyo")
  return now.toLocaleString("ja")
}

type discordTimeFlag = "f" | "F" | "d" | "D" | "t" | "T" | "R"

/** Translate Temporal Instant to Discord format time string.
 * @param {Temporal.Instant | Temporal.PlainDateTime | Temporal.ZonedDateTime} instant - Temporal time object
 * @param {discordTimeFlag} flag
 * f:     short date time:    `June 27, 2021 9:48 PM`
 *
 * F:     long date time:     `Sunday, June 27, 2021 9:48 PM`
 *
 * d:     short date:         `06/27/2021`
 *
 * D:     long date:          `June 27, 2021`
 *
 * t:     short time:         `9:48 PM`
 *
 * T:     long time:          `9:48:37 PM`
 *
 * R:     relative time:      `2 days ago` (default)
 */
export function discordTime(
  instant: Temporal.Instant | Temporal.ZonedDateTime,
  flag: discordTimeFlag = "R"
): string {
  let instantObj: Temporal.Instant
  if (instant instanceof Temporal.Instant) {
    instantObj = instant
  } else if (instant instanceof Temporal.ZonedDateTime) {
    instantObj = instant.toInstant()
  } else {
    throw new Error("Invalid Temporal object type")
  }
  const t = Math.round(Number(instantObj.epochNanoseconds) / 1_000_000_000)
  return `<t:${t.toString()}:${flag}>`
}

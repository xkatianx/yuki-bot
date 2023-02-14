
/** Waiting 1.234 sec： await sleep(1234) */
export async function sleep (ms: number): Promise<null> {
  return await new Promise(resolve => { setTimeout(resolve, ms) })
}

/* timeZones
https://stackoverflow.com/questions/38399465/how-to-get-list-of-all-timezones-in-javascript
*/

/** current time in Taiwan. example output: '2022/9/5 下午2:40:00' */
export function twNow (): string {
  return new Date().toLocaleString('tw', { timeZone: 'Asia/Taipei' })
}

/** current time in Japan. example output: '2022/9/5 15:40:00' */
export function jpNow (): string {
  return new Date().toLocaleString('ja', { timeZone: 'Japan' })
}

type discordTimeFlag = 'f' | 'F' | 'd' | 'D' | 't' | 'T' | 'R'

/** Translate Date object to Discord format time string.
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
export function discordTime (date: Date, flag: discordTimeFlag = 'R'): string {
  const t = Math.round(date.getTime() / 1000)
  return `<t:${t}:${flag}>`
}

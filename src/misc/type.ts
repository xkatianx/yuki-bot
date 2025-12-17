/**
 * Use this to make sure you handle all cases in a switch statement.
 * @param switching - The variable used in the switch statement.
 * @example
 * switch (value) {
 *   case "a":
 *     break
 *   default:
 *     noDefault(value)
 * }
 * @throws {Error} - If the default case is reached.
 */
export function noDefault(switching: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(switching)}`)
}

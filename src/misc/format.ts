/**
 *
 * @param format "foo {} bar {} baz"
 * @param args ["1", "0"]
 * @returns "foo 1 bar 0 baz"
 */
export function formatString(format: string, args: string[]): string {
  const arr = format.split("{}");
  let out = "";
  while (arr.length > 0) {
    out += arr.shift();
    out += args.shift() ?? "";
  }
  return out;
}

/**
 *
 * @param message "foo 1 bar 0 baz"
 * @param format "foo {} bar {} baz"
 * @returns ["1", "0"]
 */
export function formatArgument(message: string, format: string) {
  const re = new RegExp("^" + format.replaceAll("{}", "(.*?)") + "$");
  return message.match(re) as string[] | null;
}

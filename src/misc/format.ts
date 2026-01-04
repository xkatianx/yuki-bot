/**
 * Format a string with a template and data.
 * @param template - The template to format.
 * @param data - The data to format the template with.
 * @returns The formatted string.
 * @example
 * formatString("Hello, {name}!", { name: "John" })
 * // "Hello, John!"
 * formatString("Hello, {name}! You are {age} years old.", { name: "John", age: "20" })
 * // "Hello, John! You are 20 years old."
 * formatString("Hello, {name}! You are {age} years old.", { name: "John" })
 * // "Hello, John! You are {age} years old."
 */
export function formatString(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return data[key] ?? match
  })
}

/**
 * Parses a formatted string based on a template and returns an object of extracted data.
 * @param template - The template string with {keys}.
 * @param formattedString - The fully formatted string.
 * @returns A dictionary of keys and values, or null if the string doesn't match the template.
 * @throws never
 * @example
 * const template = "Hello, {user}. You look {status} today {user}!";
 * const formatted = "Hello, Mark. You look great today Mark!";
 * const data = parseString(template, formatted);
 * console.log(data);
 * // { user: 'Mark', status: 'great' }
 * const nonMatchingFormatted = "Hi, Mark. You look great today Mark!"; // 'Hi' instead of 'Hello'
 * const failedData = parseString(template, nonMatchingFormatted);
 * console.log(failedData);
 * // null
 */
export function parseString(
  template: string,
  formattedString: string
): Map<string, string> | null {
  // --- Step 1: Extract the ordered list of keys from the template ---
  const keyRegex = /\{(\w+)\}/g
  const keys = []
  let match
  while ((match = keyRegex.exec(template)) !== null) {
    if (match[1] != null) keys.push(match[1])
  }
  // Example: template "Hello {user}, {status}" -> keys = ['user', 'status']

  // --- Step 2: Convert the template string into a matchable Regex pattern ---

  // First, escape any special regex characters in the static parts of the template
  // (e.g., periods '.', question marks '?', etc.)
  let pattern = template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  // Second, replace the {key} placeholders with a regex capture group (.*?)
  // (.*?) means "capture any character, zero or more times, but non-greedily"
  pattern = pattern.replace(/\\{(\w+)\\}/g, "(.*?)")

  // Add start (^) and end ($) anchors to ensure the *whole* string matches the template
  const finalRegex = new RegExp(`^${pattern}$`)

  // --- Step 3: Match the formatted string against the generated Regex ---
  const matchResult = formattedString.match(finalRegex)

  if (!matchResult) {
    // If the formatted string doesn't fit the template pattern exactly
    return null
  }

  // --- Step 4: Map the captured values back to their original keys ---
  const resultDict = new Map<string, string>()
  // matchResult[0] is the full string; subsequent indices are the capture groups
  keys.forEach((key, i) => {
    // We use i + 1 to access the regex capture groups
    const value = matchResult[i + 1]
    if (value != null) resultDict.set(key, value)
  })

  return resultDict
}

/**
 * Join a list of strings with a newline character.
 * @param lines - The list of strings to join.
 * @returns The joined string.
 * @throws never
 * @example
 * lines("Hello", "World")
 * // "Hello\nWorld"
 */
export function lines(...lines: string[]): string {
  return lines.join("\n")
}

/**
 * Display a code block with backticks escaped.
 * @param code - The code to display.
 * @returns The displayed code.
 * @example
 * displayCode("Hello, `world`!")
 * // "`Hello, \\`world\\`!`"
 */
export function displayCode(code: string): string {
  return "`" + code.replace(/`/g, "\\`") + "`"
}

export function displayCodeBlock(code: string): string {
  return "```\n" + code + "\n```"
}

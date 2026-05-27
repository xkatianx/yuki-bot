import { describe, expect, it } from "bun:test"
import {
  displayCode,
  displayCodeBlock,
  formatString,
  lines,
  parseString,
} from "./format.js"

describe("format", () => {
  describe("formatString", () => {
    it("should format a simple template with one placeholder", () => {
      const result = formatString("Hello, {name}!", { name: "John" })
      expect(result).toBe("Hello, John!")
    })

    it("should format a template with multiple placeholders", () => {
      const result = formatString("Hello, {name}! You are {age} years old.", {
        name: "John",
        age: "20",
      })
      expect(result).toBe("Hello, John! You are 20 years old.")
    })

    it("should keep placeholders that don't have data", () => {
      const result = formatString("Hello, {name}! You are {age} years old.", {
        name: "John",
      })
      expect(result).toBe("Hello, John! You are {age} years old.")
    })

    it("should handle empty template", () => {
      const result = formatString("", { name: "John" })
      expect(result).toBe("")
    })

    it("should handle template with no placeholders", () => {
      const result = formatString("Hello, World!", { name: "John" })
      expect(result).toBe("Hello, World!")
    })

    it("should handle empty data object", () => {
      const result = formatString("Hello, {name}!", {})
      expect(result).toBe("Hello, {name}!")
    })

    it("should handle multiple occurrences of the same key", () => {
      const result = formatString(
        "Hello, {user}. You look {status} today {user}!",
        {
          user: "Mark",
          status: "great",
        }
      )
      expect(result).toBe("Hello, Mark. You look great today Mark!")
    })

    it("should handle special characters in values", () => {
      const result = formatString("Message: {msg}", { msg: "Hello & Goodbye!" })
      expect(result).toBe("Message: Hello & Goodbye!")
    })

    it("should handle numeric values as strings", () => {
      const result = formatString("Count: {count}", { count: "42" })
      expect(result).toBe("Count: 42")
    })
  })

  describe("parseString", () => {
    it("should parse a simple formatted string", () => {
      const template = "Hello, {name}!"
      const formatted = "Hello, John!"
      const result = parseString(template, formatted)

      expect(result).not.toBeNull()
      expect(result?.get("name")).toBe("John")
    })

    it("should parse a string with multiple placeholders", () => {
      const template = "Hello, {user}. You look {status} today {user}!"
      const formatted = "Hello, Mark. You look great today Mark!"
      const result = parseString(template, formatted)

      expect(result).not.toBeNull()
      expect(result?.get("user")).toBe("Mark")
      expect(result?.get("status")).toBe("great")
    })

    it("should return null for non-matching strings", () => {
      const template = "Hello, {name}!"
      const formatted = "Hi, John!"
      const result = parseString(template, formatted)

      expect(result).toBeNull()
    })

    it("should handle empty template and empty formatted string", () => {
      const result = parseString("", "")
      expect(result).not.toBeNull()
      expect(result?.size).toBe(0)
    })

    it("should return null if formatted string doesn't match empty template", () => {
      const result = parseString("", "Hello")
      expect(result).toBeNull()
    })

    it("should handle template with no placeholders", () => {
      const result = parseString("Hello, World!", "Hello, World!")
      expect(result).not.toBeNull()
      expect(result?.size).toBe(0)
    })

    it("should return null if template with no placeholders doesn't match", () => {
      const result = parseString("Hello, World!", "Hello, Universe!")
      expect(result).toBeNull()
    })

    it("should handle special regex characters in template", () => {
      const template = "Price: ${price}. Is it on sale? {sale}"
      const formatted = "Price: $10.99. Is it on sale? yes"
      const result = parseString(template, formatted)

      expect(result).not.toBeNull()
      expect(result?.get("price")).toBe("10.99")
      expect(result?.get("sale")).toBe("yes")
    })

    it("should handle multiple occurrences of the same key", () => {
      const template = "Hello, {user}. You look {status} today {user}!"
      const formatted = "Hello, Mark. You look great today Mark!"
      const result = parseString(template, formatted)

      expect(result).not.toBeNull()
      // The last occurrence value is used (or first, depending on implementation)
      // Actually, looking at the code, it processes keys in order and uses the last match
      expect(result?.get("user")).toBe("Mark")
      expect(result?.get("status")).toBe("great")
    })

    it("should handle values with special characters", () => {
      const template = "Message: {msg}"
      const formatted = "Message: Hello & Goodbye!"
      const result = parseString(template, formatted)

      expect(result).not.toBeNull()
      expect(result?.get("msg")).toBe("Hello & Goodbye!")
    })

    it("should handle empty values", () => {
      const template = "Hello, {name}!"
      const formatted = "Hello, !"
      const result = parseString(template, formatted)

      expect(result).not.toBeNull()
      expect(result?.get("name")).toBe("")
    })

    it("should handle template with brackets in static text", () => {
      const template = "Array: [{items}]"
      const formatted = "Array: [apple, banana]"
      const result = parseString(template, formatted)

      expect(result).not.toBeNull()
      expect(result?.get("items")).toBe("apple, banana")
    })
  })

  describe("lines", () => {
    it("should join multiple strings with newlines", () => {
      const result = lines("Hello", "World")
      expect(result).toBe("Hello\nWorld")
    })

    it("should handle single string", () => {
      const result = lines("Hello")
      expect(result).toBe("Hello")
    })

    it("should handle empty strings", () => {
      const result = lines("", "")
      expect(result).toBe("\n")
    })

    it("should handle multiple lines", () => {
      const result = lines("Line 1", "Line 2", "Line 3")
      expect(result).toBe("Line 1\nLine 2\nLine 3")
    })

    it("should handle no arguments", () => {
      const result = lines()
      expect(result).toBe("")
    })

    it("should handle strings with newlines already", () => {
      const result = lines("Hello\nWorld", "Test")
      expect(result).toBe("Hello\nWorld\nTest")
    })
  })

  describe("displayCode", () => {
    it("should wrap code in backticks", () => {
      const result = displayCode("console.log('hello')")
      expect(result).toBe("`console.log('hello')`")
    })

    it("should escape backticks in code", () => {
      const result = displayCode("Hello, `world`!")
      expect(result).toBe("`Hello, \\`world\\`!`")
    })

    it("should handle multiple backticks", () => {
      const result = displayCode("`code` and `more`")
      expect(result).toBe("`\\`code\\` and \\`more\\``")
    })

    it("should handle empty string", () => {
      const result = displayCode("")
      expect(result).toBe("``")
    })

    it("should handle string with no backticks", () => {
      const result = displayCode("plain text")
      expect(result).toBe("`plain text`")
    })

    it("should handle only backticks", () => {
      const result = displayCode("```")
      expect(result).toBe("`\\`\\`\\``")
    })
  })

  describe("displayCodeBlock", () => {
    it("should wrap code in triple backticks with newlines", () => {
      const result = displayCodeBlock("console.log('hello')")
      expect(result).toBe("```\nconsole.log('hello')\n```")
    })

    it("should handle code with backticks", () => {
      const result = displayCodeBlock("Hello, `world`!")
      expect(result).toBe("```\nHello, `world`!\n```")
    })

    it("should handle empty string", () => {
      const result = displayCodeBlock("")
      expect(result).toBe("```\n\n```")
    })

    it("should handle multiline code", () => {
      const result = displayCodeBlock("line1\nline2\nline3")
      expect(result).toBe("```\nline1\nline2\nline3\n```")
    })

    it("should handle code with single backticks", () => {
      const result = displayCodeBlock("`code`")
      expect(result).toBe("```\n`code`\n```")
    })

    it("should handle code with double backticks", () => {
      const result = displayCodeBlock("``code``")
      expect(result).toBe("```\n``code``\n```")
    })

    it("should NOT handle code with triple backticks correctly (will break markdown rendering)", () => {
      // Note: Code containing triple backticks (```) or more will break the markdown code block
      // because the fence uses triple backticks. This is a known limitation.
      // The function simply wraps with ```, so triple backticks in code will close the block early.
      const result = displayCodeBlock("```code```")
      expect(result).toBe("```\n```code```\n```")
      // This will render incorrectly in markdown as the inner ``` closes the code block early
      // The current known solution is to insert a ZWS but I don't like it
      // TODO: Find a better solution
    })

    it("should NOT handle code with four or more backticks correctly (will break markdown rendering)", () => {
      // Note: Code containing four or more backticks will break the markdown code block.
      // This is a known limitation. The function simply wraps with ```, no special handling.
      const result = displayCodeBlock("````code````")
      expect(result).toBe("```\n````code````\n```")
      // This will render incorrectly in markdown
    })
  })
})

import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { createServer } from "node:http"
import MyBrowser, { BrowserError, BrowserErrorCode } from "./browser.js"

describe("MyBrowser", () => {
  let server: ReturnType<typeof createServer> | null = null
  let serverUrl = ""
  let testHtml: string

  beforeEach(async () => {
    // Create a simple HTTP server for testing
    testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <h1>Hello World</h1>
        </body>
      </html>
    `

    await new Promise<void>((resolve) => {
      server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(testHtml)
      })
      server.listen(0, () => {
        const address = server?.address()
        if (address && typeof address === "object") {
          serverUrl = `http://localhost:${address.port.toString()}`
        }
        resolve()
      })
    })
  })

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => {
          resolve()
        })
      })
      server = null
    }
  })

  describe("new", () => {
    it("should create a browser instance", async () => {
      const result = await MyBrowser.new()
      expect(result.isOk()).toBe(true)
      await using browser = result.unwrap()
      expect(browser).toBeInstanceOf(MyBrowser)
      expect(browser.browser).toBeDefined()
    }, 30000)

    it("should create a browser instance with optional URL parameter", async () => {
      const result = await MyBrowser.new(serverUrl)
      expect(result.isOk()).toBe(true)
      await using browser = result.unwrap()
      expect(browser).toBeInstanceOf(MyBrowser)
      expect(browser.browser).toBeDefined()
    }, 30000)
  })

  describe("parseUrl", () => {
    it("should parse valid URL correctly", () => {
      const result = MyBrowser.parseUrl("https://example.com/path?query=1")
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().href).toBe("https://example.com/path?query=1")
    })

    it("should parse URL with hash", () => {
      const result = MyBrowser.parseUrl("https://example.com/path#section")
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().hash).toBe("#section")
    })

    it("should parse URL with port", () => {
      const result = MyBrowser.parseUrl("https://example.com:8080/path")
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().port).toBe("8080")
    })

    it("should return error for invalid URL", () => {
      const result = MyBrowser.parseUrl("not-a-valid-url")
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.name).toBe("BrowserError")
        expect(result.error.code).toBe(BrowserErrorCode.INVALID_URL)
        expect(result.error.message).toContain("Invalid URL")
      }
    })

    it("should return error for empty string", () => {
      const result = MyBrowser.parseUrl("")
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.code).toBe(BrowserErrorCode.INVALID_URL)
      }
    })

    it("should handle URL with spaces (URL constructor encodes them)", () => {
      // Note: URL constructor actually accepts spaces and encodes them
      const result = MyBrowser.parseUrl("https://example.com/path with spaces")
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.unwrap().pathname).toBe("/path%20with%20spaces")
      }
    })
  })

  describe("browse", () => {
    it("should navigate to a URL successfully", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      const result = await browser.browse(serverUrl)

      expect(result.isOk()).toBe(true)
      // browse() now returns the HTTP response from page.goto()
      expect(result.unwrap()).toBeDefined()
      // HTTPResponse can be null or an object, both are valid
    }, 30000)

    it("should handle navigation errors (non-existent URL)", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      const result = await browser.browse(
        "http://invalid-url-that-does-not-exist-12345.com"
      )
      expect(result.isErr()).toBe(true)
      expect(result.unwrapErr()).toBeInstanceOf(BrowserError)
      expect(result.unwrapErr().code).toBe(BrowserErrorCode.INVALID_URL)
    }, 30000)

    it("should handle navigation errors (timeout)", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      browser.TIMEOUT_SECONDS = 1
      // Test net (RFC 5737)
      const result = await browser.browse("http://192.0.2.0")
      expect(result.isErr()).toBe(true)
      expect(result.unwrapErr()).toBeInstanceOf(BrowserError)
      expect(result.unwrapErr().code).toBe(BrowserErrorCode.TIMEOUT)
    }, 30000)

    it("should handle empty URL string", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      const result = await browser.browse("")
      expect(result.isErr()).toBe(true)
      const error = result.unwrapErr()
      expect(error).toBeInstanceOf(BrowserError)
      expect(error.code).toBe(BrowserErrorCode.INVALID_URL)
    }, 30000)

    it("should handle malformed URL", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      const result = await browser.browse("not://a-valid-url")
      expect(result.isErr()).toBe(true)
      // The error might be a BrowserError or a different error type depending on the error
      const error = result.unwrapErr()
      expect(error).toBeInstanceOf(BrowserError)
      expect(error.code).toBe(BrowserErrorCode.ABORTED)
    }, 30000)

    it("should handle relative URL", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      const result = await browser.browse("/relative/path")
      expect(result.isErr()).toBe(true)
      const error = result.unwrapErr()
      expect(error).toBeInstanceOf(BrowserError)
      expect(error.code).toBe(BrowserErrorCode.INVALID_URL)
    }, 30000)
  })

  describe("getUrl", () => {
    it("should get the current page URL", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)
      const result = await browser.getUrl()

      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toContain("localhost")
    }, 30000)

    it("should get URL even without browsing first", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      // Don't browse first, but try to get URL
      // This should still work because getPage will create a page automatically
      const result = await browser.getUrl()

      // Should succeed because getPage creates page automatically
      expect(result.isOk()).toBe(true)
    }, 30000)
  })

  describe("getTitle", () => {
    it("should get the page title", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)
      const result = await browser.getTitle()

      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBe("Test Page")
    }, 30000)

    it("should wait for title changes", async () => {
      // Create a page that changes title
      const dynamicHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Initial Title</title>
            <script>
              setTimeout(() => {
                document.title = "Changed Title";
              }, 100);
            </script>
          </head>
          <body>
            <h1>Test</h1>
          </body>
        </html>
      `

      await new Promise<void>((resolve) => {
        const dynamicServer = createServer((_req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(dynamicHtml)
        })
        async function listen() {
          const address = dynamicServer.address()
          if (address && typeof address === "object") {
            const dynamicUrl = `http://localhost:${address.port.toString()}`
            const browserResult = await MyBrowser.new()
            expect(browserResult.isOk()).toBe(true)

            await using browser = browserResult.unwrap()
            await browser.browse(dynamicUrl)
            // Wait a bit for title to change
            await new Promise((r) => setTimeout(r, 200))
            const result = await browser.getTitle()

            expect(result.isOk()).toBe(true)
            // Should get the changed title
            expect(result.unwrap()).toBe("Changed Title")

            dynamicServer.close(() => {
              resolve()
            })
          }
        }
        dynamicServer.listen(0, () => {
          void listen()
        })
      })
    }, 30000)

    it("should handle page with empty title", async () => {
      const emptyTitleHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title></title>
          </head>
          <body>
            <h1>No Title</h1>
          </body>
        </html>
      `

      await new Promise<void>((resolve) => {
        const emptyTitleServer = createServer((_req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(emptyTitleHtml)
        })
        async function listen() {
          const address = emptyTitleServer.address()
          if (address && typeof address === "object") {
            const emptyTitleUrl = `http://localhost:${address.port.toString()}`
            const browserResult = await MyBrowser.new()
            expect(browserResult.isOk()).toBe(true)

            await using browser = browserResult.unwrap()
            await browser.browse(emptyTitleUrl)
            const result = await browser.getTitle()

            expect(result.isOk()).toBe(true)
            expect(result.unwrap()).toBe("")

            emptyTitleServer.close(() => {
              resolve()
            })
          }
        }
        emptyTitleServer.listen(0, () => {
          void listen()
        })
      })
    }, 30000)

    it("should handle page with special characters in title", async () => {
      const specialTitleHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Title &amp; Special &lt;Chars&gt;</title>
          </head>
          <body>
            <h1>Test</h1>
          </body>
        </html>
      `

      await new Promise<void>((resolve) => {
        const specialTitleServer = createServer((_req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(specialTitleHtml)
        })
        async function listen() {
          const address = specialTitleServer.address()
          if (address && typeof address === "object") {
            const specialTitleUrl = `http://localhost:${address.port.toString()}`
            const browserResult = await MyBrowser.new()
            expect(browserResult.isOk()).toBe(true)

            await using browser = browserResult.unwrap()
            await browser.browse(specialTitleUrl)
            const result = await browser.getTitle()

            expect(result.isOk()).toBe(true)
            // HTML entities should be decoded
            expect(result.unwrap()).toBe("Title & Special <Chars>")

            specialTitleServer.close(() => {
              resolve()
            })
          }
        }
        specialTitleServer.listen(0, () => {
          void listen()
        })
      })
    }, 30000)
  })

  describe("screenshot", () => {
    it("should take a screenshot successfully", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)
      const filename = "test-screenshot.png" as const
      const result = await browser.screenshot(filename)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeDefined()
      // Check if file was created (this is a buffer in puppeteer)
      expect(Buffer.isBuffer(result.unwrap())).toBe(true)
    }, 30000)

    it("should use default filename if not provided", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)
      const result = await browser.screenshot()

      expect(result.isOk()).toBe(true)
      expect(Buffer.isBuffer(result.unwrap())).toBe(true)
    }, 30000)

    it("should support different image formats", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)

      const pngResult = await browser.screenshot("test.png")
      expect(pngResult.isOk()).toBe(true)

      const jpegResult = await browser.screenshot("test.jpeg")
      expect(jpegResult.isOk()).toBe(true)

      const webpResult = await browser.screenshot("test.webp")
      expect(webpResult.isOk()).toBe(true)
    }, 30000)

    it("should handle screenshot without browsing first", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      // Don't browse first, but try to screenshot
      // getPage will create a page automatically
      const result = await browser.screenshot("test-no-browse.png")

      expect(result.isOk()).toBe(true)
      expect(Buffer.isBuffer(result.unwrap())).toBe(true)
    }, 30000)

    it("should handle screenshot with invalid filename", async () => {
      const result = await MyBrowser.new().andThen((browser) =>
        browser.screenshot("invalid/filename.png")
      )
      expect(result.isErr()).toBe(true)
      expect(result.unwrapErr()).toBeInstanceOf(BrowserError)
      expect(result.unwrapErr().code).toBe(
        BrowserErrorCode.INVALID_SCREENSHOT_FILENAME
      )
    }, 30000)
  })

  describe("disposal", () => {
    it("should close browser on dispose using using block", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      const browser = browserResult.unwrap()
      let wasConnected = false

      {
        await using _browser = browser
        await _browser.browse(serverUrl)

        // Browser should be connected before disposal
        wasConnected = _browser.browser.connected
        expect(wasConnected).toBe(true)
      }
      // After the using block, browser should be disposed
      expect(browser.browser.connected).toBe(false)
    }, 30000)

    it("should close browser on direct dispose call", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      const browser = browserResult.unwrap()
      await browser.browse(serverUrl)

      // Browser should be connected before disposal
      expect(browser.browser.connected).toBe(true)

      // Dispose directly
      await browser[Symbol.asyncDispose]()

      // Browser should be disconnected after disposal
      expect(browser.browser.connected).toBe(false)
    }, 30000)

    it("should handle multiple dispose calls gracefully", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      const browser = browserResult.unwrap()
      await browser.browse(serverUrl)

      expect(browser.browser.connected).toBe(true)

      // First dispose
      await browser[Symbol.asyncDispose]()
      expect(browser.browser.connected).toBe(false)

      // Second dispose should not throw
      await browser[Symbol.asyncDispose]()
      expect(browser.browser.connected).toBe(false)
    }, 30000)
  })

  describe("browser lifecycle", () => {
    it("should reuse browser instance for multiple operations", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      // Browser should be connected
      expect(browser.browser.connected).toBe(true)

      await browser.browse(serverUrl)
      const firstUrl = await browser.getUrl()

      await browser.browse(serverUrl)
      const secondUrl = await browser.getUrl()

      // Both operations should succeed, indicating browser is working
      expect(firstUrl.isOk()).toBe(true)
      expect(secondUrl.isOk()).toBe(true)
      // Browser should still be connected
      expect(browser.browser.connected).toBe(true)
    }, 30000)

    it("should verify browser connection state throughout lifecycle", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      const browser = browserResult.unwrap()

      // Initially connected
      expect(browser.browser.connected).toBe(true)

      // Still connected after operations
      await browser.browse(serverUrl)
      expect(browser.browser.connected).toBe(true)

      const urlResult = await browser.getUrl()
      expect(urlResult.isOk()).toBe(true)
      expect(browser.browser.connected).toBe(true)

      // Disconnect
      await browser[Symbol.asyncDispose]()
      expect(browser.browser.connected).toBe(false)
    }, 30000)
  })

  describe("BrowserError", () => {
    it("should create BrowserError with correct properties", () => {
      const error = BrowserError.new(
        BrowserErrorCode.INVALID_URL,
        "Test error message"
      )

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe("BrowserError")
      expect(error.code).toBe(BrowserErrorCode.INVALID_URL)
      expect(error.message).toBe("Test error message")
    })

    it("should create BrowserError with TIMEOUT code", () => {
      const error = BrowserError.new(
        BrowserErrorCode.TIMEOUT,
        "Connection timeout"
      )

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe("BrowserError")
      expect(error.code).toBe(BrowserErrorCode.TIMEOUT)
      expect(error.message).toBe("Connection timeout")
    })

    it("should be instance of Error", () => {
      const error = BrowserError.new(BrowserErrorCode.INVALID_URL, "Test error")

      expect(error instanceof Error).toBe(true)
    })

    it("should have different error codes", () => {
      const invalidUrlError = BrowserError.new(
        BrowserErrorCode.INVALID_URL,
        "Invalid URL"
      )
      const timeoutError = BrowserError.new(BrowserErrorCode.TIMEOUT, "Timeout")

      expect(invalidUrlError.code).toBe(BrowserErrorCode.INVALID_URL)
      expect(timeoutError.code).toBe(BrowserErrorCode.TIMEOUT)
      expect(invalidUrlError.code).not.toBe(timeoutError.code)
    })
  })

  describe("TIMEOUT_SECONDS", () => {
    it("should have default timeout of 12 seconds", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      expect(browser.TIMEOUT_SECONDS).toBe(12)
    }, 30000)

    it("should allow modifying timeout", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      browser.TIMEOUT_SECONDS = 5
      expect(browser.TIMEOUT_SECONDS).toBe(5)
    }, 30000)
  })

  describe("page reuse", () => {
    it("should reuse existing page when available", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      expect(browser.browser.connected).toBe(true)

      // First operation creates a page
      await browser.browse(serverUrl)
      const firstUrl = await browser.getUrl()

      // Second operation should reuse the same page
      await browser.browse(serverUrl)
      const secondUrl = await browser.getUrl()

      expect(firstUrl.isOk()).toBe(true)
      expect(secondUrl.isOk()).toBe(true)
      // Both should point to the same server
      expect(firstUrl.unwrap()).toContain("localhost")
      expect(secondUrl.unwrap()).toContain("localhost")
      // Browser should still be connected
      expect(browser.browser.connected).toBe(true)
    }, 30000)

    it("should create new page if none exists", async () => {
      const browserResult = await MyBrowser.new()
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      expect(browser.browser.connected).toBe(true)

      // getUrl should create a page automatically
      const result = await browser.getUrl()

      expect(result.isOk()).toBe(true)
      // Browser should still be connected
      expect(browser.browser.connected).toBe(true)
    }, 30000)
  })
})

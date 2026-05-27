import { createServer } from "http"
import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import {
  YukiBrowser,
  YukiBrowserError,
  YukiBrowserErrorCode,
} from "./yukiBrowser.js"

describe("YukiBrowser", () => {
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
          <a href="/puzzle/1">Puzzle 1</a>
          <a href="/puzzles/2">Puzzle 2</a>
          <a href="/puzzle/3">Puzzle 3</a>
        </body>
      </html>
    `

    await new Promise<void>((resolve) => {
      server = createServer((req, res) => {
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
    it("should create a YukiBrowser instance with valid URL", async () => {
      const result = await YukiBrowser.new(serverUrl)
      expect(result.isOk()).toBe(true)
      await using browser = result.unwrap()
      expect(browser).toBeInstanceOf(YukiBrowser)
      expect(browser.browser).toBeDefined()
      expect(browser.mainUrl.href).toBe(serverUrl + "/")
      expect(browser.isLogin).toBe(false)
    }, 30000)

    it("should return error for invalid URL", async () => {
      const result = await YukiBrowser.new("not-a-valid-url")
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.name).toBe("BrowserError")
      }
    })

    it("should create browser with correct mainUrl", async () => {
      const testUrl = "https://example.com/path?query=1"
      const result = await YukiBrowser.new(testUrl)
      expect(result.isOk()).toBe(true)
      await using browser = result.unwrap()
      expect(browser.mainUrl.href).toBe("https://example.com/path?query=1")
    }, 30000)
  })

  describe("constructor", () => {
    it("should create instance with browser and mainUrl", async () => {
      const browserResult = await YukiBrowser.new(serverUrl)
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      expect(browser.browser).toBeDefined()
      expect(browser.mainUrl).toBeInstanceOf(URL)
      expect(browser.isLogin).toBe(false)
    }, 30000)
  })

  describe("getPuzzles", () => {
    it("should get puzzle links from page", async () => {
      const browserResult = await YukiBrowser.new(serverUrl)
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)
      const result = await browser.getPuzzles()

      expect(result.isOk()).toBe(true)
      const puzzles = result.unwrap()
      expect(Array.isArray(puzzles)).toBe(true)
      expect(puzzles.length).toBeGreaterThan(0)
      // Check that links contain puzzle references
      const hasPuzzleLink = puzzles.some((link) => link.includes("/puzzle"))
      expect(hasPuzzleLink).toBe(true)
    }, 30000)

    it("should return empty array if no puzzle links found", async () => {
      const noPuzzleHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>No Puzzles</title></head>
          <body><h1>No puzzles here</h1></body>
        </html>
      `

      await new Promise<void>((resolve) => {
        const noPuzzleServer = createServer((req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(noPuzzleHtml)
        })

        async function listen() {
          const address = noPuzzleServer.address()
          if (address && typeof address === "object") {
            const noPuzzleUrl = `http://localhost:${address.port.toString()}`
            const browserResult = await YukiBrowser.new(noPuzzleUrl)
            expect(browserResult.isOk()).toBe(true)

            await using browser = browserResult.unwrap()
            await browser.browse(noPuzzleUrl)
            const result = await browser.getPuzzles()

            expect(result.isOk()).toBe(true)
            expect(Array.isArray(result.unwrap())).toBe(true)
            expect(result.unwrap().length).toBe(0)

            noPuzzleServer.close(() => {
              resolve()
            })
          }
        }
        noPuzzleServer.listen(0, () => {
          void listen()
        })
      })
    }, 30000)

    it("should filter duplicate links", async () => {
      const duplicateHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <a href="/puzzle/1">Puzzle 1</a>
            <a href="/puzzle/1">Puzzle 1 Duplicate</a>
            <a href="/puzzles/2">Puzzle 2</a>
          </body>
        </html>
      `

      await new Promise<void>((resolve) => {
        const duplicateServer = createServer((req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(duplicateHtml)
        })
        async function listen() {
          const address = duplicateServer.address()
          if (address && typeof address === "object") {
            const duplicateUrl = `http://localhost:${address.port.toString()}`
            const browserResult = await YukiBrowser.new(duplicateUrl)
            expect(browserResult.isOk()).toBe(true)

            await using browser = browserResult.unwrap()
            await browser.browse(duplicateUrl)
            const result = await browser.getPuzzles()

            expect(result.isOk()).toBe(true)
            // Should have only 2 unique links, not 3
            expect(result.unwrap().length).toBe(2)

            duplicateServer.close(() => {
              resolve()
            })
          }
        }
        duplicateServer.listen(0, () => {
          void listen()
        })
      })
    }, 30000)
  })

  describe("login", () => {
    it("should return error if input boxes not found", async () => {
      const noInputHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>No inputs here</h1>
          </body>
        </html>
      `

      await new Promise<void>((resolve) => {
        const noInputServer = createServer((req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(noInputHtml)
        })
        async function listen() {
          const address = noInputServer.address()
          if (address && typeof address === "object") {
            const noInputUrl = `http://localhost:${address.port.toString()}`
            const browserResult = await YukiBrowser.new(noInputUrl)
            expect(browserResult.isOk()).toBe(true)

            await using browser = browserResult.unwrap()
            const result = await browser.login("user", "pass", noInputUrl)

            expect(result.isErr()).toBe(true)
            if (result.isErr()) {
              expect(result.error.name).toBe("YukiBrowserError")
              expect(result.error.code).toBe(
                YukiBrowserErrorCode.LOGIN_INPUT_NOT_FOUND
              )
            }

            noInputServer.close(() => {
              resolve()
            })
          }
        }
        noInputServer.listen(0, () => {
          void listen()
        })
      })
    }, 30000)

    it("should return error if submit button not found", async () => {
      const noSubmitHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <input type="text" name="username" />
            <input type="password" />
          </body>
        </html>
      `

      await new Promise<void>((resolve) => {
        const noSubmitServer = createServer((req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(noSubmitHtml)
        })
        async function listen() {
          const address = noSubmitServer.address()
          if (address && typeof address === "object") {
            const noSubmitUrl = `http://localhost:${address.port.toString()}`
            const browserResult = await YukiBrowser.new(noSubmitUrl)
            expect(browserResult.isOk()).toBe(true)

            await using browser = browserResult.unwrap()
            const result = await browser.login("user", "pass", noSubmitUrl)

            expect(result.isErr()).toBe(true)
            if (result.isErr()) {
              expect(result.error.name).toBe("YukiBrowserError")
              expect(result.error.code).toBe(
                YukiBrowserErrorCode.SUBMIT_NOT_FOUND
              )
            }

            noSubmitServer.close(() => {
              resolve()
            })
          }
        }
        noSubmitServer.listen(0, () => {
          void listen()
        })
      })
    }, 30000)

    it("should attempt login with valid form", async () => {
      const loginFormHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <form>
              <input type="text" name="username" />
              <input type="password" />
              <button type="submit">Submit</button>
            </form>
          </body>
        </html>
      `

      await new Promise<void>((resolve) => {
        const loginFormServer = createServer((req, res) => {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(loginFormHtml)
        })
        async function listen() {
          const address = loginFormServer.address()
          if (address && typeof address === "object") {
            const loginFormUrl = `http://localhost:${address.port.toString()}`
            const browserResult = await YukiBrowser.new(loginFormUrl)
            expect(browserResult.isOk()).toBe(true)

            await using browser = browserResult.unwrap()
            const result = await browser.login(
              "testuser",
              "testpass",
              loginFormUrl
            )

            // The login might succeed or fail depending on navigation,
            // but should not throw and should set isLogin if successful
            expect(result).toBeDefined()
            // If successful, isLogin should be true
            if (result.isOk()) {
              expect(browser.isLogin).toBe(true)
            }

            loginFormServer.close(() => {
              resolve()
            })
          }
        }
        loginFormServer.listen(0, () => {
          void listen()
        })
      })
    }, 30000)
  })

  describe("inherited methods", () => {
    it("should inherit browse method from MyBrowser", async () => {
      const browserResult = await YukiBrowser.new(serverUrl)
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      const result = await browser.browse(serverUrl)

      expect(result.isOk()).toBe(true)
      // browse() now returns the HTTP response from page.goto()
      expect(result.unwrap()).toBeDefined()
      // HTTPResponse can be null or an object, both are valid
    }, 30000)

    it("should inherit getUrl method from MyBrowser", async () => {
      const browserResult = await YukiBrowser.new(serverUrl)
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)
      const result = await browser.getUrl()

      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toContain("localhost")
    }, 30000)

    it("should inherit getTitle method from MyBrowser", async () => {
      const browserResult = await YukiBrowser.new(serverUrl)
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)
      const result = await browser.getTitle()

      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBe("Test Page")
    }, 30000)

    it("should inherit screenshot method from MyBrowser", async () => {
      const browserResult = await YukiBrowser.new(serverUrl)
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      await browser.browse(serverUrl)
      const result = await browser.screenshot("yuki-test.png")

      expect(result.isOk()).toBe(true)
      expect(Buffer.isBuffer(result.unwrap())).toBe(true)
    }, 30000)
  })

  describe("YukiBrowserError", () => {
    it("should create YukiBrowserError with correct properties", () => {
      const error = YukiBrowserError.new(
        YukiBrowserErrorCode.ALREADY_LOGIN,
        "Test error message"
      )

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe("YukiBrowserError")
      expect(error.code).toBe(YukiBrowserErrorCode.ALREADY_LOGIN)
      expect(error.message).toBe("Test error message")
    })

    it("should be instance of Error", () => {
      const error = YukiBrowserError.new(
        YukiBrowserErrorCode.LOGIN_INPUT_NOT_FOUND,
        "Test error"
      )

      expect(error instanceof Error).toBe(true)
    })

    it("should support all error codes", () => {
      const codes = [
        YukiBrowserErrorCode.ALREADY_LOGIN,
        YukiBrowserErrorCode.LOGIN_INPUT_NOT_FOUND,
        YukiBrowserErrorCode.SUBMIT_NOT_FOUND,
        YukiBrowserErrorCode.MISSING_PAGE,
      ]

      codes.forEach((code) => {
        const error = YukiBrowserError.new(code, `Error for ${code.toString()}`)
        expect(error.code).toBe(code)
        expect(error.name).toBe("YukiBrowserError")
      })
    })
  })

  describe("isLogin property", () => {
    it("should be false by default", async () => {
      const browserResult = await YukiBrowser.new(serverUrl)
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      expect(browser.isLogin).toBe(false)
    }, 30000)

    it("should be settable", async () => {
      const browserResult = await YukiBrowser.new(serverUrl)
      expect(browserResult.isOk()).toBe(true)

      await using browser = browserResult.unwrap()
      browser.isLogin = true
      expect(browser.isLogin).toBe(true)

      browser.isLogin = false
      expect(browser.isLogin).toBe(false)
    }, 30000)
  })
})

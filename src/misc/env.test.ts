import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
  type Mock,
} from "bun:test"
import { envUtils } from "./env"

describe("env", () => {
  let consoleLogSpy: Mock<typeof console.log>

  beforeEach(() => {
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {
      // Do nothing
    })
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  it("should import the env variables from the .env.test file", () => {
    expect(process.env.ENV_TEST_IS_IMPORTED).toBe("true")
  })

  describe("envUtils.required", () => {
    it("should return the string value", () => {
      expect(envUtils.required("ENV_TEST_IS_IMPORTED")).toBe("true")
      expect(envUtils.required("ENV_TEST_SPACE")).toBe(" ")
      expect(envUtils.required("ENV_TEST_EMPTY")).toBe("")
    })
    it("should throw error when the environment variable is missing", () => {
      expect(() => envUtils.required("ENV_TEST_MISSING")).toThrow()
    })
  })

  describe("envUtils.optional", () => {
    it("should return the string value", () => {
      expect(envUtils.optional("ENV_TEST_IS_IMPORTED")).toBe("true")
      expect(envUtils.optional("ENV_TEST_SPACE")).toBe(" ")
      expect(envUtils.optional("ENV_TEST_EMPTY")).toBe("")
    })
    it("should return undefined when the environment variable is missing", () => {
      expect(envUtils.optional("ENV_TEST_MISSING")).toBeUndefined()
    })
  })
})

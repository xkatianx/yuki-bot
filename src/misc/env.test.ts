import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import type { DotenvConfigOptions } from "dotenv"
import type { env } from "./env"

const fatalMock = mock((message: string) => {
  throw new Error(message)
})

const configMock = mock((_options?: DotenvConfigOptions) => {
  return {}
})

await mock.module("dotenv", () => ({
  config: configMock,
}))

await mock.module("./cli.js", () => ({
  fatal: fatalMock,
}))

const trackedEnvKeys = [
  "TEMPLATE_SETTINGS_SHEET_NAME",
  "TEMPLATE_SETTINGS_SHEET_ID",
  "TEMPLATE_PUZZLES_SHEET_NAME",
  "TEMPLATE_PUZZLES_SHEET_ID",
  "DISCORD_BOT_ID",
  "DISCORD_BOT_TOKEN",
  "DISCORD_SERVER_ID",
] as const

const savedEnv = new Map<string, string | undefined>()

function clearTrackedEnv() {
  for (const key of trackedEnvKeys) {
    if (!savedEnv.has(key)) {
      savedEnv.set(key, process.env[key])
    }
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete process.env[key]
  }
}

function stubEnv(vars: Record<string, string>) {
  for (const [key, value] of Object.entries(vars)) {
    if (!savedEnv.has(key)) {
      savedEnv.set(key, process.env[key])
    }
    process.env[key] = value
  }
}

function unstubAllEnvs() {
  for (const key of trackedEnvKeys) {
    if (!savedEnv.has(key)) continue
    const value = savedEnv.get(key)
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key]
    } else {
      process.env[key] = value
    }
    savedEnv.delete(key)
  }
}

async function importEnv() {
  return import(`./env.js?test=${Bun.randomUUIDv7()}`) as Promise<{
    env: typeof env
  }>
}

describe("env", () => {
  beforeEach(() => {
    fatalMock.mockClear()
    configMock.mockClear()
  })

  afterEach(() => {
    unstubAllEnvs()
  })

  describe("required environment variables", () => {
    beforeEach(() => {
      clearTrackedEnv()
    })

    it("should throw fatal error when TEMPLATE_SETTINGS_SHEET_NAME is missing", () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_ID: "test-client-id",
        DISCORD_BOT_TOKEN: "test-token",
      })

      expect(importEnv()).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "TEMPLATE_SETTINGS_SHEET_NAME"'
      )
    })

    it("should throw fatal error when TEMPLATE_SETTINGS_SHEET_ID is missing", () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_ID: "test-client-id",
        DISCORD_BOT_TOKEN: "test-token",
      })

      expect(importEnv()).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "TEMPLATE_SETTINGS_SHEET_ID"'
      )
    })

    it("should throw fatal error when TEMPLATE_PUZZLES_SHEET_NAME is missing", () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_ID: "test-client-id",
        DISCORD_BOT_TOKEN: "test-token",
      })

      expect(importEnv()).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "TEMPLATE_PUZZLES_SHEET_NAME"'
      )
    })

    it("should throw fatal error when TEMPLATE_PUZZLES_SHEET_ID is missing", () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        DISCORD_BOT_ID: "test-client-id",
        DISCORD_BOT_TOKEN: "test-token",
      })

      expect(importEnv()).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "TEMPLATE_PUZZLES_SHEET_ID"'
      )
    })

    it("should throw fatal error when DISCORD_BOT_ID is missing", () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_TOKEN: "test-token",
      })

      expect(importEnv()).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "DISCORD_BOT_ID"'
      )
    })

    it("should throw fatal error when DISCORD_BOT_TOKEN is missing", () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_ID: "test-client-id",
      })

      expect(importEnv()).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "DISCORD_BOT_TOKEN"'
      )
    })
  })

  describe("optional environment variables", () => {
    beforeEach(() => {
      clearTrackedEnv()
    })

    it("should work with all required variables and no optional variables", async () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_ID: "test-client-id",
        DISCORD_BOT_TOKEN: "test-token",
      })

      const { env } = await importEnv()

      expect(env.settingsName).toBe("test-settings")
      expect(env.settingsId).toBe("test-id")
      expect(env.puzzlesName).toBe("test-puzzles")
      expect(env.puzzlesId).toBe("test-puzzles-id")
      expect(env.DC.ID).toBe("test-client-id")
      expect(env.DC.TOKEN).toBe("test-token")
      expect(env.DC.GID).toBeUndefined()
      expect(fatalMock).not.toHaveBeenCalled()
    })

    it("should include optional DISCORD_SERVER_ID when provided", async () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_ID: "test-client-id",
        DISCORD_SERVER_ID: "test-server-id",
        DISCORD_BOT_TOKEN: "test-token",
      })

      const { env } = await importEnv()

      expect(env.DC.GID).toBe("test-server-id")
      expect(fatalMock).not.toHaveBeenCalled()
    })
  })

  describe("env object structure", () => {
    beforeEach(() => {
      clearTrackedEnv()
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_ID: "test-client-id",
        DISCORD_BOT_TOKEN: "test-token",
      })
    })

    it("should export env object with correct structure", async () => {
      const { env } = await importEnv()

      expect(env).toHaveProperty("settingsName")
      expect(env).toHaveProperty("settingsId")
      expect(env).toHaveProperty("puzzlesName")
      expect(env).toHaveProperty("puzzlesId")
      expect(env).toHaveProperty("DC")
      expect(env.DC).toHaveProperty("ID")
      expect(env.DC).toHaveProperty("TOKEN")
      expect(env.DC).toHaveProperty("GID")
    })

    it("should have correct types for all properties", async () => {
      const { env } = await importEnv()

      expect(typeof env.settingsName).toBe("string")
      expect(typeof env.settingsId).toBe("string")
      expect(typeof env.puzzlesName).toBe("string")
      expect(typeof env.puzzlesId).toBe("string")
      expect(typeof env.DC.ID).toBe("string")
      expect(typeof env.DC.TOKEN).toBe("string")
    })
  })

  describe("dotenv config", () => {
    beforeEach(() => {
      clearTrackedEnv()
    })

    it("should call dotenv config with .env and .env.local in order", async () => {
      stubEnv({
        TEMPLATE_SETTINGS_SHEET_NAME: "test-settings",
        TEMPLATE_SETTINGS_SHEET_ID: "test-id",
        TEMPLATE_PUZZLES_SHEET_NAME: "test-puzzles",
        TEMPLATE_PUZZLES_SHEET_ID: "test-puzzles-id",
        DISCORD_BOT_ID: "test-client-id",
        DISCORD_BOT_TOKEN: "test-token",
      })

      await importEnv()

      expect(configMock).toHaveBeenCalledTimes(2)
      expect(configMock).toHaveBeenNthCalledWith(1, { path: ".env" })
      expect(configMock).toHaveBeenNthCalledWith(2, {
        path: ".env.local",
        override: true,
      })
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock fatal before any imports
const fatalMock = vi.fn().mockImplementation((message: string) => {
  throw new Error(message)
})

// Mock dotenv config function
const configMock = vi.fn((_options?: { path?: string | string[] }) => {
  // Simulate dotenv behavior: when path is an array, load files in order
  // Later files override earlier ones
  // Note: In real usage, dotenv would load files sequentially and merge them
  // For testing, we verify the order is correct and test override behavior separately
  return {}
})

// Mock dotenv to prevent loading .env files during tests
vi.mock("dotenv", () => ({
  config: configMock,
}))

vi.mock("./cli.js", () => ({
  fatal: fatalMock,
}))

describe("env", () => {
  beforeEach(() => {
    // Reset modules to ensure fresh imports
    vi.resetModules()
    // Reset the mock call history
    fatalMock.mockClear()
    configMock.mockClear()
  })

  afterEach(() => {
    // Restore environment
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  describe("required environment variables", () => {
    it("should throw fatal error when TEMPLATE_SETTINGS_SHEET_NAME is missing", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      await expect(async () => {
        await import("./env.js")
      }).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "TEMPLATE_SETTINGS_SHEET_NAME"'
      )
    })

    it("should throw fatal error when TEMPLATE_SETTINGS_SHEET_ID is missing", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      await expect(async () => {
        await import("./env.js")
      }).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "TEMPLATE_SETTINGS_SHEET_ID"'
      )
    })

    it("should throw fatal error when TEMPLATE_PUZZLES_SHEET_NAME is missing", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      await expect(async () => {
        await import("./env.js")
      }).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "TEMPLATE_PUZZLES_SHEET_NAME"'
      )
    })

    it("should throw fatal error when TEMPLATE_PUZZLES_SHEET_ID is missing", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      await expect(async () => {
        await import("./env.js")
      }).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "TEMPLATE_PUZZLES_SHEET_ID"'
      )
    })

    it("should throw fatal error when DISCORD_BOT_ID is missing", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      await expect(async () => {
        await import("./env.js")
      }).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "DISCORD_BOT_ID"'
      )
    })

    it("should throw fatal error when DISCORD_BOT_TOKEN is missing", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")

      await expect(async () => {
        await import("./env.js")
      }).rejects.toThrow()

      expect(fatalMock).toHaveBeenCalledWith(
        'in .env: missing "DISCORD_BOT_TOKEN"'
      )
    })
  })

  describe("optional environment variables", () => {
    it("should work with all required variables and no optional variables", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      const { env } = await import("./env.js")

      expect(env.settingsName).toBe("test-settings")
      expect(env.settingsId).toBe("test-id")
      expect(env.puzzlesName).toBe("test-puzzles")
      expect(env.puzzlesId).toBe("test-puzzles-id")
      expect(env.DC.ID).toBe("test-client-id")
      expect(env.DC.TOKEN).toBe("test-token")
      expect(env.DC.GID).toBeUndefined()
      expect(env.DC.CID).toBeUndefined()
      expect(fatalMock).not.toHaveBeenCalled()
    })

    it("should include optional id_of_discord_server when provided", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("id_of_discord_server", "test-server-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      const { env } = await import("./env.js")

      expect(env.DC.GID).toBe("test-server-id")
      expect(fatalMock).not.toHaveBeenCalled()
    })

    it("should include optional id_of_debugging_channel when provided", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("id_of_debugging_channel", "test-channel-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      const { env } = await import("./env.js")

      expect(env.DC.CID).toBe("test-channel-id")
      expect(fatalMock).not.toHaveBeenCalled()
    })

    it("should include all optional variables when provided", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("id_of_discord_server", "test-server-id")
      vi.stubEnv("id_of_debugging_channel", "test-channel-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      const { env } = await import("./env.js")

      expect(env.DC.GID).toBe("test-server-id")
      expect(env.DC.CID).toBe("test-channel-id")
      expect(fatalMock).not.toHaveBeenCalled()
    })
  })

  describe("env object structure", () => {
    beforeEach(() => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")
    })

    it("should export env object with correct structure", async () => {
      const { env } = await import("./env.js")

      expect(env).toHaveProperty("settingsName")
      expect(env).toHaveProperty("settingsId")
      expect(env).toHaveProperty("puzzlesName")
      expect(env).toHaveProperty("puzzlesId")
      expect(env).toHaveProperty("DC")
      expect(env.DC).toHaveProperty("ID")
      expect(env.DC).toHaveProperty("TOKEN")
      expect(env.DC).toHaveProperty("GID")
      expect(env.DC).toHaveProperty("CID")
    })

    it("should have correct types for all properties", async () => {
      const { env } = await import("./env.js")

      expect(typeof env.settingsName).toBe("string")
      expect(typeof env.settingsId).toBe("string")
      expect(typeof env.puzzlesName).toBe("string")
      expect(typeof env.puzzlesId).toBe("string")
      expect(typeof env.DC.ID).toBe("string")
      expect(typeof env.DC.TOKEN).toBe("string")
    })
  })

  describe("dotenv config", () => {
    it("should call dotenv config with .env and .env.local in order", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      await import("./env.js")

      expect(configMock).toHaveBeenCalledTimes(2)
      expect(configMock).toHaveBeenNthCalledWith(1, { path: ".env" })
      expect(configMock).toHaveBeenNthCalledWith(2, { path: ".env.local" })
    })

    it("should load files in correct order (.env first, then .env.local)", async () => {
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_NAME", "test-settings")
      vi.stubEnv("TEMPLATE_SETTINGS_SHEET_ID", "test-id")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_NAME", "test-puzzles")
      vi.stubEnv("TEMPLATE_PUZZLES_SHEET_ID", "test-puzzles-id")
      vi.stubEnv("DISCORD_BOT_ID", "test-client-id")
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-token")

      await import("./env.js")

      // Verify .env is called first
      expect(configMock).toHaveBeenNthCalledWith(1, { path: ".env" })
      // Verify .env.local is called second
      expect(configMock).toHaveBeenNthCalledWith(2, { path: ".env.local" })
    })
  })
})

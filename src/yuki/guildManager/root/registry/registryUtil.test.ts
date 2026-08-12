import { describe, expect, it } from "bun:test"
import { findEntry, type RegistryEntry, upsertEntry } from "./registryUtil"

const entry: RegistryEntry = {
  guildId: "123456789012345678",
  guildName: "My Guild",
  rootUrl: "https://drive.google.com/drive/u/0/folders/abc123",
  loggingChannelId: "876543210987654321",
}

describe("findEntry", () => {
  it("should return null on an empty table", () => {
    expect(findEntry([], entry.guildId)).toBeNull()
  })

  it("should return null when the guild is not in the table", () => {
    const table = upsertEntry([], entry)
    expect(findEntry(table, "not-a-guild-id")).toBeNull()
  })

  it("should return null when the root url is empty", () => {
    const table = [[entry.guildId, entry.guildName, "", "123"]]
    expect(findEntry(table, entry.guildId)).toBeNull()
  })

  it("should tolerate missing trailing columns", () => {
    const table = [[entry.guildId, entry.guildName, entry.rootUrl]]
    expect(findEntry(table, entry.guildId)).toEqual({
      ...entry,
      loggingChannelId: "",
    })
  })
})

describe("upsertEntry", () => {
  it("should add a header row and the entry to an empty table", () => {
    const table = upsertEntry([], entry)
    expect(table).toHaveLength(2)
    expect(table[0]).toEqual([
      "guildId",
      "guildName",
      "rootUrl",
      "loggingChannelId",
    ])
    expect(findEntry(table, entry.guildId)).toEqual(entry)
  })

  it("should update the existing row instead of adding a new one", () => {
    const table = upsertEntry([], entry)
    const updated: RegistryEntry = {
      ...entry,
      rootUrl: "https://drive.google.com/drive/u/0/folders/xyz789",
      loggingChannelId: "111111111111111111",
    }
    upsertEntry(table, updated)
    expect(table).toHaveLength(2)
    expect(findEntry(table, entry.guildId)).toEqual(updated)
  })

  it("should keep entries of different guilds independent", () => {
    const other: RegistryEntry = {
      guildId: "222222222222222222",
      guildName: "Other Guild",
      rootUrl: "https://drive.google.com/drive/u/0/folders/other",
      loggingChannelId: "333333333333333333",
    }
    const table = upsertEntry(upsertEntry([], entry), other)
    expect(table).toHaveLength(3)
    expect(findEntry(table, entry.guildId)).toEqual(entry)
    expect(findEntry(table, other.guildId)).toEqual(other)
  })
})

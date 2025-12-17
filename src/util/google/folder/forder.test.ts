import { describe, expect, it } from "vitest"
import { env } from "~misc/env.js"
import { GSpreadsheet } from "../sheet/sheet.js"
import { GFolderError, GFolderErrorCode } from "./error.js"
import { GFolder } from "./folder.js"

const ownedFolderId = "13lr6oOYTFlNypQNIKx5J8S_stKKHfKfm"
const privateFolderId = "1GYn_chQtcV5g71HVRhHXZo9JFKku8gwG"

describe("GFolder", () => {
  const timestamp = new Date().toISOString()
  const uniqueName = `delete me ${timestamp}`

  describe("constructor and getters", () => {
    it("should create a folder with the given id", () => {
      const folder = new GFolder(ownedFolderId)
      expect(folder.id).toBe(ownedFolderId)
    })

    it("should return the correct url", () => {
      const folder = new GFolder(ownedFolderId)
      expect(folder.url).toBe(
        `https://drive.google.com/drive/u/0/folders/${ownedFolderId}`
      )
    })
  })

  describe("fromUrl", () => {
    it("should create a folder from a valid Google Drive URL", () => {
      const url = `https://drive.google.com/drive/u/0/folders/${ownedFolderId}`
      const result = GFolder.fromUrl(url)
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().id).toBe(ownedFolderId)
    })

    it("should create a folder from a valid Google Drive URL without /u/0/", () => {
      const url = `https://drive.google.com/drive/folders/${ownedFolderId}`
      const result = GFolder.fromUrl(url)
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().id).toBe(ownedFolderId)
    })

    it("should return INVALID_URL error for invalid URL", () => {
      const url = "https://invalid-url.com"
      const result = GFolder.fromUrl(url)
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.INVALID_URL)
    })

    it("should return INVALID_URL error for non-Google URL", () => {
      const url = "https://example.com/folder/123"
      const result = GFolder.fromUrl(url)
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.INVALID_URL)
    })
  })

  describe("getName", () => {
    it("should read a public folder", async () => {
      const folder = new GFolder(ownedFolderId)
      const name = await folder.getName()
      expect(name.isOk()).toBe(true)
      expect(name.unwrap()).toBe("public")
    })

    it("should throw MISSING_FILE error when read a private folder", async () => {
      const folder = new GFolder(privateFolderId)
      const name = await folder.getName()
      expect(name.isErr()).toBe(true)
      const err = name.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_FILE)
    })
  })

  describe("checkWritePermission", () => {
    it("should return ok for a folder with write permission", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.checkWritePermission()
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBe(folder)
    })

    it("should return MISSING_FILE error for a private folder", async () => {
      const folder = new GFolder(privateFolderId)
      const result = await folder.checkWritePermission()
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_FILE)
    })
  })

  describe("newFolder", () => {
    it("should create a subfolder in an owned folder", async () => {
      const folder = new GFolder(ownedFolderId)
      const subfolder = await folder.newFolder(uniqueName)
      expect(subfolder.isOk()).toBe(true)
      const createdFolder = subfolder.unwrap()
      expect(createdFolder).toBeInstanceOf(GFolder)
      expect(createdFolder.id).toBeTruthy()
    })

    it("should throw MISSING_FILE error when create a subfolder in a private folder", async () => {
      const folder = new GFolder(privateFolderId)
      const subfolder = await folder.newFolder(uniqueName)
      expect(subfolder.isErr()).toBe(true)
      const err = subfolder.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_FILE)
    })
  })

  describe("findFolders", () => {
    it("should find folders with the given name", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.findFolders(uniqueName)
      expect(result.isOk()).toBe(true)
      expect(Array.isArray(result.unwrap())).toBe(true)
      result.unwrap().forEach((f) => {
        expect(f).toBeInstanceOf(GFolder)
      })
    })

    it("should return MISSING_FOLDER error when folder does not exist", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.findFolders(timestamp + "xx")
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_FOLDER)
    })
  })

  describe("findUniqueFolder", () => {
    it("should find a unique folder when exactly one exists", async () => {
      const folder = new GFolder(ownedFolderId)
      const findResult = await folder.findUniqueFolder(uniqueName)
      expect(findResult.isOk()).toBe(true)
      expect(findResult.unwrap()).toBeInstanceOf(GFolder)
    })

    it("should return MISSING_FOLDER error when folder does not exist", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.findUniqueFolder(timestamp + "xx")
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_FOLDER)
    })
  })

  describe("getOrCreateFolder", () => {
    it("should get an existing folder if it exists", async () => {
      const folder = new GFolder(ownedFolderId)
      const getResult = await folder.getOrCreateFolder(uniqueName)
      expect(getResult.isOk()).toBe(true)
      expect(getResult.unwrap()).toBeInstanceOf(GFolder)
    })

    it("should create a folder if it does not exist", async () => {
      const folder = new GFolder(ownedFolderId)
      const uniqueName = `newFolder_${Date.now().toString()}`
      const result = await folder.getOrCreateFolder(uniqueName)
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeInstanceOf(GFolder)
    })
  })

  describe("findSpreadsheets", () => {
    it("should return MISSING_SPREADSHEET error when spreadsheet does not exist", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.findSpreadsheets(
        "nonExistentSpreadsheet12345"
      )
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_SPREADSHEET)
    })
  })

  describe("findUniqueSpreadsheet", () => {
    it("should return MISSING_SPREADSHEET error when spreadsheet does not exist", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.findUniqueSpreadsheet(
        "nonExistentSpreadsheet12345"
      )
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_SPREADSHEET)
    })
  })

  describe("pasteSpreadsheet", () => {
    const template = new GSpreadsheet(env.puzzlesId)

    it("should paste a spreadsheet to an owned folder", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.pasteSpreadsheet(template, "testPastedSheet")
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeInstanceOf(GSpreadsheet)
    }, 20000)

    it("should throw error when pasting to a private folder", async () => {
      const folder = new GFolder(privateFolderId)
      const result = await folder.pasteSpreadsheet(template, "testPastedSheet")
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_FILE)
    })
  })
})

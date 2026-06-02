import { AsyncResult } from "always-panic"
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  expectTypeOf,
  it,
} from "bun:test"
import { google } from "googleapis"
import { env } from "~misc/env.js"
import { sleep } from "~misc/time/misc.js"
import { myGoogleInfo } from "../auth/auth.js"
import { GSpreadsheet } from "../sheet/sheet.js"
import { GFolderError, GFolderErrorCode } from "./error.js"
import { GFolder } from "./folder.js"

const drive = google.drive({ version: "v3", auth: myGoogleInfo.auth })

const ownedFolderId = "13lr6oOYTFlNypQNIKx5J8S_stKKHfKfm"
const privateFolderId = "1GYn_chQtcV5g71HVRhHXZo9JFKku8gwG"

describe("GFolder", () => {
  const timestamp = new Date().toISOString()
  const uniqueName = `delete me ${timestamp}`
  const uniqueNameSymbols = String.raw`${uniqueName} Test 'John\'s & Mary's' "Final" / \ : * ? < > | + - _ ~ ${"`"} @ # $ % ^ & * ( ) [ ] { } , . ; Project! 🚀 📁 漢字 Cyrillic العربية עברית 1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`
  const absentName = "delete me"
  const sheetTestFolderName = `sheet tests ${timestamp}`
  const pastedSheetName = `testPastedSheet ${timestamp}`

  async function trashAllFolders(parent: GFolder, name: string) {
    const folders = await parent.findFolders(name)
    if (folders.isOk()) {
      await AsyncResult.all(
        folders.unwrap().map((folder) => folder.moveToTrash())
      )
    }
  }

  async function trashAllSpreadsheets(parent: GFolder, name: string) {
    const sheets = await parent.findSpreadsheets(name)
    if (sheets.isOk()) {
      await AsyncResult.all(
        sheets.unwrap().map((sheet) => new GFolder(sheet.id).moveToTrash())
      )
    }
  }

  async function isTrashed(fileId: string) {
    const res = await drive.files.get({ fileId, fields: "trashed" })
    return res.data.trashed === true
  }

  async function waitUntilAllTrashed(fileIds: string[], timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const trashed = await Promise.all(fileIds.map(isTrashed))
      if (trashed.every(Boolean)) return
      await sleep(500)
    }
    for (const fileId of fileIds) {
      expect(await isTrashed(fileId)).toBe(true)
    }
  }

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

    it.skip("should return CANNOT_WRITE error for a readonly folder", async () => {
      // TODO: create a readonly folder
      const folder = new GFolder(ownedFolderId)
      const result = await folder.checkWritePermission()
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.CANNOT_WRITE)
      expect(err.info).toEqual({ folderId: ownedFolderId })
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

    it("should create a subfolder with special symbols in an owned folder", async () => {
      const folder = new GFolder(ownedFolderId)
      const subfolder = await folder.newFolder(uniqueNameSymbols)
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

  describe("findUniqueFolder", () => {
    it("should find a unique folder when exactly one exists", async () => {
      const folder = new GFolder(ownedFolderId)
      const findResult = await folder.findUniqueFolder(uniqueNameSymbols)
      expect(findResult.isOk()).toBe(true)
      const foundFolder = findResult.unwrap()
      expect(foundFolder).toBeInstanceOf(GFolder)
      const name = await foundFolder.getName()
      expect(name.isOk()).toBe(true)
      expect(name.unwrap()).toBe(uniqueNameSymbols)
    })

    it("should return MISSING_FOLDER error when folder does not exist", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.findUniqueFolder(timestamp + "xx")
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MISSING_FOLDER)
    })

    it("should return MANY_FOLDERS error when multiple folders with the same name exist", async () => {
      const folder = new GFolder(ownedFolderId)
      await folder.newFolder(uniqueName)
      await folder.newFolder(uniqueName)
      const result = await folder.findUniqueFolder(uniqueName)
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MANY_FOLDERS)
    }, 10000)
  })

  describe("findFolders", () => {
    it("should find folders with the given name", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.findFolders(uniqueName)
      expect(result.isOk()).toBe(true)
      const subFolders = result.unwrap()
      expectTypeOf(subFolders).toEqualTypeOf<GFolder[]>()
      for (const subFolder of subFolders) {
        const name = await subFolder.getName()
        expect(name.isOk()).toBe(true)
        expect(name.unwrap()).toBe(uniqueName)
      }
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

  describe("getOrCreateFolder", () => {
    it("should get an existing folder if it exists and is unique", async () => {
      const folder = new GFolder(ownedFolderId)
      const getResult = await folder.getOrCreateFolder(uniqueNameSymbols)
      expect(getResult.isOk()).toBe(true)
      expect(getResult.unwrap()).toBeInstanceOf(GFolder)
    })

    it("should return MANY_FOLDERS error when multiple folders with the same name exist", async () => {
      const folder = new GFolder(ownedFolderId)
      const result = await folder.getOrCreateFolder(uniqueName)
      expect(result.isErr()).toBe(true)
      const err = result.unwrapErr()
      expect(err).toBeInstanceOf(GFolderError)
      expect(err.code).toBe(GFolderErrorCode.MANY_FOLDERS)
    })

    it("should create a folder if it does not exist", async () => {
      const folder = new GFolder(ownedFolderId)

      const subfolders = await folder.findFolders(absentName)
      expect(subfolders.unwrapErr().code).toBe(GFolderErrorCode.MISSING_FOLDER)

      const result = await folder.getOrCreateFolder(absentName)
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeInstanceOf(GFolder)

      const subfolder = await folder.findUniqueFolder(absentName)
      expect(subfolder.isOk()).toBe(true)
      expect(subfolder.unwrap().id).toBe(result.unwrap().id)
    }, 10000)
  })
  describe("spreadsheets", () => {
    let sheetTestFolder: GFolder

    beforeAll(async () => {
      const parent = new GFolder(ownedFolderId)
      sheetTestFolder = (
        await parent.getOrCreateFolder(sheetTestFolderName)
      ).unwrap()
    })

    afterAll(async () => {
      await sheetTestFolder.moveToTrash()
    })

    describe("findSpreadsheets", () => {
      it("should return MISSING_SPREADSHEET error when spreadsheet does not exist", async () => {
        const result = await sheetTestFolder.findSpreadsheets(
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
        const result = await sheetTestFolder.findUniqueSpreadsheet(
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
        const result = await sheetTestFolder.pasteSpreadsheet(
          template,
          pastedSheetName
        )
        expect(result.isOk()).toBe(true)
        expect(result.unwrap()).toBeInstanceOf(GSpreadsheet)

        const found =
          await sheetTestFolder.findUniqueSpreadsheet(pastedSheetName)
        expect(found.isOk()).toBe(true)
      }, 25000)

      it("should throw error when pasting to a private folder", async () => {
        const folder = new GFolder(privateFolderId)
        const result = await folder.pasteSpreadsheet(template, pastedSheetName)
        expect(result.isErr()).toBe(true)
        const err = result.unwrapErr()
        expect(err).toBeInstanceOf(GFolderError)
        expect(err.code).toBe(GFolderErrorCode.MISSING_FILE)
      })
    })
  })

  describe("moveToTrash", () => {
    it("should move a non-empty folder and its contents to the trash", async () => {
      const parent = new GFolder(ownedFolderId)
      const trashTestName = `trash test ${timestamp}`
      const nestedFolderName = `nested ${timestamp}`
      const nestedSheetName = `nested sheet ${timestamp}`
      const template = new GSpreadsheet(env.puzzlesId)

      const folder = (await parent.newFolder(trashTestName)).unwrap()
      const nested = (await folder.newFolder(nestedFolderName)).unwrap()
      const pasted = (
        await folder.pasteSpreadsheet(template, nestedSheetName)
      ).unwrap()

      expect((await folder.findFolders(nestedFolderName)).isOk()).toBe(true)
      expect((await folder.findSpreadsheets(nestedSheetName)).isOk()).toBe(true)

      const trashResult = await folder.moveToTrash()
      expect(trashResult.isOk()).toBe(true)

      expect((await parent.findFolders(trashTestName)).unwrapErr().code).toBe(
        GFolderErrorCode.MISSING_FOLDER
      )

      await waitUntilAllTrashed([folder.id, nested.id, pasted.id])
    }, 25000)

    it("should clean up all folders and spreadsheets created by tests", async () => {
      const parent = new GFolder(ownedFolderId)

      for (const name of [absentName, uniqueName, uniqueNameSymbols]) {
        await trashAllFolders(parent, name)
        const res = await parent.findFolders(name)
        expect(res.unwrapErr().code).toBe(GFolderErrorCode.MISSING_FOLDER)
      }

      await trashAllFolders(parent, sheetTestFolderName)
      const sheetFolderRes = await parent.findFolders(sheetTestFolderName)
      expect(sheetFolderRes.unwrapErr().code).toBe(
        GFolderErrorCode.MISSING_FOLDER
      )

      await trashAllSpreadsheets(parent, pastedSheetName)
      await trashAllSpreadsheets(parent, "testPastedSheet")
      const sheetRes = await parent.findSpreadsheets(pastedSheetName)
      expect(sheetRes.unwrapErr().code).toBe(
        GFolderErrorCode.MISSING_SPREADSHEET
      )
      const legacySheetRes = await parent.findSpreadsheets("testPastedSheet")
      expect(legacySheetRes.unwrapErr().code).toBe(
        GFolderErrorCode.MISSING_SPREADSHEET
      )
    }, 25000)
  })
})

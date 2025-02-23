import {
  describe,
  expect,
  it,
} from "vitest";

import {
  GFolderError,
  GFolderErrorCode,
} from "./error.js";
import { GFolder } from "./folder.js";

const ownedFolderId = "13lr6oOYTFlNypQNIKx5J8S_stKKHfKfm";
const privateFolderId = "1GYn_chQtcV5g71HVRhHXZo9JFKku8gwG";

describe("GFolder", () => {
  it("should read a public folder", async () => {
    const folder = new GFolder(ownedFolderId);
    const name = await folder.getName();
    expect(name.isOk()).toBe(true);
    expect(name.unwrap()).toBe("public");
  });

  it("should throw MISSING_FILE error when read a private folder", async () => {
    const folder = new GFolder(privateFolderId);
    const name = await folder.getName();
    expect(name.isErr()).toBe(true);
    const err = name.unwrapErr();
    expect(err).toBeInstanceOf(GFolderError);
    expect(err.code).toBe(GFolderErrorCode.MISSING_FILE);
  });

  // it("should create a subfolder in an owned folder", async () => {
  //   const folder = new GFolder(ownedFolderId);
  //   const subfolder = await folder.newFolder("testFolder");
  //   expect(subfolder.isOk()).toBe(true);
  //   expect(subfolder.unwrap()).toBeInstanceOf(GFolder);
  // });

  it("should throw MISSING_FILE error when create a subfolder in a private folder", async () => {
    const folder = new GFolder(privateFolderId);
    const subfolder = await folder.newFolder("testFolder");
    expect(subfolder.isErr()).toBe(true);
    const err = subfolder.unwrapErr();
    expect(err).toBeInstanceOf(GFolderError);
    expect(err.code).toBe(GFolderErrorCode.MISSING_FILE);
  });
});

import { describe, expect, it } from "vitest";

import { myGoogleInfo } from "./index.js";

describe("Google Auth", () => {
  it("should successfully authenticate with Google", async () => {
    expect(myGoogleInfo.projectId).toBeDefined();
    console.log("project-id:", myGoogleInfo.projectId);

    expect(myGoogleInfo.email).toBeDefined();
    console.log("e-mail:", myGoogleInfo.email);
  });
});

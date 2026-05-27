import { describe, expect, it } from "bun:test"
import { myGoogleInfo } from "./auth.js"

describe("Google Auth", () => {
  it("should successfully authenticate with Google", () => {
    expect(myGoogleInfo.projectId).toBeDefined()
    console.log("project-id:", myGoogleInfo.projectId)

    expect(myGoogleInfo.email).toBeDefined()
    console.log("e-mail:", myGoogleInfo.email)
  })
})

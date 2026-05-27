import { err, ok, type Result } from "always-panic"

export function parseUrlResult(url: string): Result<URL, Error> {
  try {
    return ok(new URL(url))
  } catch (e) {
    if (e instanceof Error) return err(e)
    return err(new Error(String(e)))
  }
}

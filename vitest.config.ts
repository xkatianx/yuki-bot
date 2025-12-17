import { defineConfig } from "vitest/config"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "~util": path.resolve(__dirname, "./src/util"),
      "~misc": path.resolve(__dirname, "./src/misc"),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
})

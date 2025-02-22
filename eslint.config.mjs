import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tseslint from 'typescript-eslint';

import { includeIgnoreFile } from '@eslint/compat';
import eslint from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  // {
  //   rules: {
  //     "@typescript-eslint/no-explicit-any": "off",
  //     "@typescript-eslint/ban-ts-comment": "off",
  //     "@typescript-eslint/no-unused-vars": "warn",
  //     "@typescript-eslint/no-namespace": "warn",
  //     "@typescript-eslint/no-wrapper-object-types": "off",
  //   },
  // },
  {
    ignores: ["*.config.*", "**/type.ts", "**/*.d.ts"],
  }
);

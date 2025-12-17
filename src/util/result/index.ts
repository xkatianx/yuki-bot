export { default as AsyncResult } from "./result/asyncResult.js"
export type {
  ErrContent,
  OkContent,
  Result,
  ResultLike,
} from "./result/type.js"
export { result }
import { default as result } from "./result/util.js"
export const ok = result.ok
export const err = result.err

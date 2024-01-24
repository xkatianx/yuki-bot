/* eslint-disable */
import pkg from 'ts-results'
const { Err, Ok, ErrImpl, OkImpl } = pkg
ErrImpl.prototype.unwrapOrElse = function (fn: any) {
  return fn(this.val)
}
OkImpl.prototype.unwrapOrElse = function (_: any) {
  return this.val
}
declare module 'ts-results' {
  interface ErrImpl<E> {
    /** 
     * Returns the contained `Ok` value or a provided default.
     * 
     * (This is the `unwrap_or_else` in rust)
     */
    unwrapOrElse<T>(fn: (err: E) => T): T
  }
  interface OkImpl<T> {
    /**
     * Returns the contained `Ok` value or a provided default.
     * 
     * (This is the `unwrap_or_else` in rust)
     */
    unwrapOrElse(fn: unknown): T
  }
}
export type Result<T, E> = pkg.Result<T, E>
export { Err, Ok }

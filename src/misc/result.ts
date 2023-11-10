import pkg from 'ts-results'
const { Err, Ok } = pkg
export type Result<T, E> = pkg.Result<T, E>
export { Err, Ok }

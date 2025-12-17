/**
 * @example
 * // Waiting for 1.234 seconds
 * await sleep(1234)
 */
export async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

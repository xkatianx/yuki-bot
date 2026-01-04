import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Temporal } from "./temporal.js"
import { YYYY$MM, discordTime, jpNow, now, twNow } from "./timestamp.js"

let timer: ReturnType<typeof vi.useFakeTimers>

beforeEach(() => {
  timer = vi.useFakeTimers()
})

afterEach(() => {
  timer.useRealTimers()
})

describe("timestamp", () => {
  describe("YYYY$MM", () => {
    const in1 = "2022-09-01T00:00:00"
    const out1 = "2022/09"
    it(`should return '${out1}' if it is currently ${in1}`, () => {
      timer.setSystemTime(new Date(in1))
      expect(YYYY$MM()).toBe(out1)
    })
    const in2 = "2022-08-31T23:59:59"
    const out2 = "2022/08"
    it(`should return '${out2}' if it is currently ${in2}`, () => {
      timer.setSystemTime(new Date(in2))
      expect(YYYY$MM()).toBe(out2)
    })
  })

  describe("twNow", () => {
    const in1 = "2022-09-05T14:40:00+08:00"
    const out1 = "2022/9/5 下午2:40:00"
    it(`should return '${out1}' if it is currently ${in1}`, () => {
      timer.setSystemTime(new Date(in1))
      expect(twNow()).toBe(out1)
    })
    const in2 = "1999-10-10T16:34:56Z"
    const out2 = "1999/10/11 上午12:34:56"
    it(`should return '${out2}' if it is currently ${in2}`, () => {
      timer.setSystemTime(new Date(in2))
      expect(twNow()).toBe(out2)
    })
  })

  describe("jpNow", () => {
    const in1 = "2022-09-05T14:40:00+08:00"
    const out1 = "2022/9/5 15:40:00"
    it(`should return '${out1}' if it is currently ${in1}`, () => {
      timer.setSystemTime(new Date(in1))
      expect(jpNow()).toBe(out1)
    })
    const in2 = "1999-10-10T15:34:56Z"
    const out2 = "1999/10/11 0:34:56"
    it(`should return '${out2}' if it is currently ${in2}`, () => {
      timer.setSystemTime(new Date(in2))
      expect(jpNow()).toBe(out2)
    })
  })

  describe("now", () => {
    it("should respect timezone and locale", () => {
      const time = "2022-09-05T14:40:00Z"
      timer.setSystemTime(new Date(time))

      // Taiwan
      expect(now("Asia/Taipei", "zh-tw")).toBe("2022/9/5 下午10:40:00")
      // Japan
      expect(now("Asia/Tokyo", "ja")).toBe("2022/9/5 23:40:00")
      // US
      expect(now("America/New_York", "en-US")).toBe("9/5/2022, 10:40:00 AM")
    })

    it("should return ISO format with - when locale is missing", () => {
      const time = "2022-09-05T14:40:00Z"
      timer.setSystemTime(new Date(time))

      // Taiwan: UTC+8 -> 22:40:00
      expect(now("Asia/Taipei")).toBe("2022-09-05T22:40:00+08:00")
      // UTC
      expect(now("UTC")).toBe("2022-09-05T14:40:00+00:00")
    })
  })

  describe("discordTime", () => {
    it("should convert Temporal.Instant to Discord format with default flag", () => {
      const instant = Temporal.Instant.from("2021-06-27T12:48:37Z")
      const result = discordTime(instant)
      expect(result).toBe("<t:1624798117:R>")
    })

    it("should convert Temporal.Instant to Discord format with custom flag", () => {
      const instant = Temporal.Instant.from("2021-06-27T12:48:37Z")
      for (const flag of ["f", "F", "d", "D", "t", "T", "R"] as const) {
        const result = discordTime(instant, flag)
        expect(result).toBe(`<t:1624798117:${flag}>`)
      }
    })

    it("should convert Temporal.ZonedDateTime to Discord format", () => {
      const zonedDateTime = Temporal.ZonedDateTime.from(
        "2021-06-27T21:48:37+09:00[Asia/Tokyo]"
      )
      const result = discordTime(zonedDateTime)
      expect(result).toBe("<t:1624798117:R>")
    })

    it("should handle different timezones correctly", () => {
      const instant1 = Temporal.Instant.from(
        "2021-06-27T20:48:37+08:00[Asia/Taipei]"
      )
      const instant2 = Temporal.Instant.from(
        "2021-06-27T21:48:37+09:00[Asia/Tokyo]"
      )

      const result1 = discordTime(instant1, "R")
      const result2 = discordTime(instant2, "R")

      // Same instant should produce same timestamp
      expect(result1).toBe(result2)
    })

    it("should throw an error if the input is not a Temporal.Instant or Temporal.ZonedDateTime", () => {
      const input = "2021-06-27T12:48:37"
      expect(
        // @ts-expect-error - test invalid input
        () => discordTime(input)
      ).toThrow("Invalid Temporal object type")
    })
  })
})

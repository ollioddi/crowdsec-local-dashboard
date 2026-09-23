import { describe, expect, it } from "vitest";
import { describeWindow, humanSpan, toDateOrNull } from "./dates";

const at = (iso: string) => new Date(iso);

describe("describeWindow", () => {
	it("phrases a burst and a crawl for a sentence", () => {
		expect(
			describeWindow(at("2026-09-22T10:00:00Z"), at("2026-09-22T10:00:00.4Z")),
		).toBe("in under a second");
		expect(
			describeWindow(at("2026-09-22T10:00:00Z"), at("2026-09-22T10:04:00Z")),
		).toBe("over 4m");
		expect(
			describeWindow(at("2026-09-22T10:00:00Z"), at("2026-09-22T11:30:00Z")),
		).toBe("over 1h 30m");
	});

	it("returns null for a missing, malformed or reversed window", () => {
		expect(describeWindow(null, at("2026-09-22T10:00:00Z"))).toBeNull();
		expect(describeWindow("nope", at("2026-09-22T10:00:00Z"))).toBeNull();
		expect(
			describeWindow(at("2026-09-22T11:00:00Z"), at("2026-09-22T10:00:00Z")),
		).toBeNull();
	});
});

describe("humanSpan", () => {
	it("uses whole units in words, and hours plus minutes otherwise", () => {
		expect(humanSpan(4 * 3_600_000)).toBe("4 hours");
		expect(humanSpan(24 * 3_600_000)).toBe("1 day");
		expect(humanSpan(5 * 60_000)).toBe("5 minutes");
		expect(humanSpan(90 * 60_000)).toBe("1h 30m");
	});
});

describe("toDateOrNull", () => {
	it("is null for missing or malformed input, never 'now'", () => {
		expect(toDateOrNull(undefined)).toBeNull();
		expect(toDateOrNull("not a date")).toBeNull();
		expect(toDateOrNull("2026-09-22T10:00:00Z")).toEqual(
			at("2026-09-22T10:00:00Z"),
		);
	});
});

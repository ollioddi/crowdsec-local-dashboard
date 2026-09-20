import { beforeEach, describe, expect, it } from "vitest";
import type { LogLevel } from "./levels";
import { errorFields, initLogging, logger } from "./logger";

const lines: { line: string; level: LogLevel }[] = [];

beforeEach(() => {
	lines.length = 0;
	process.env.NO_COLOR = "1";
	initLogging({
		level: "info",
		format: "json",
		write: (line, level) => lines.push({ line, level }),
	});
});

describe("logger", () => {
	it("fills placeholders and keeps the value as a field", () => {
		logger("sync").info("Synced {count} decisions", { count: 12, full: true });
		expect(JSON.parse(lines[0].line)).toMatchObject({
			level: "info",
			logger: "sync",
			message: "Synced 12 decisions",
			count: 12,
			full: true,
		});
	});

	it("puts a string into the sentence without quotes", () => {
		logger("sync").error("Sync failed: {errorMessage}", {
			errorMessage: "fetch failed: bad port",
		});
		expect(JSON.parse(lines[0].line).message).toBe(
			"Sync failed: fetch failed: bad port",
		);
	});

	it("leaves an unmatched placeholder standing", () => {
		logger("sync").info("Synced {count} decisions");
		expect(JSON.parse(lines[0].line).message).toBe("Synced {count} decisions");
	});

	it("drops lines below the threshold", () => {
		logger("sync").debug("hidden");
		logger("sync").warn("shown");
		expect(lines.map((l) => l.level)).toEqual(["warn"]);
	});

	it("renders a human line with fields the message did not state", () => {
		initLogging({ format: "human" });
		logger("sync").info("Synced {count} decisions", {
			count: 2,
			durationMs: 40,
		});
		expect(lines[0].line).toMatch(
			/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} info {2}\[sync\] Synced 2 decisions {2}durationMs=40$/,
		);
	});
});

describe("stack traces", () => {
	it("stay off a human error line at the default level", () => {
		initLogging({ format: "human" });
		logger("sync").error(
			"Failed: {errorMessage}",
			errorFields(new Error("boom")),
		);
		expect(lines[0].line).not.toContain("\n");
	});

	it("follow the line when debug is on", () => {
		initLogging({ format: "human", level: "debug" });
		logger("sync").error(
			"Failed: {errorMessage}",
			errorFields(new Error("boom")),
		);
		expect(lines[0].line).toMatch(/\n\s+at /);
	});
});

describe("errorFields", () => {
	it("includes the cause", () => {
		const error = new Error("Sync failed", {
			cause: new Error("403 Forbidden"),
		});
		expect(errorFields(error)).toMatchObject({
			errorMessage: "Sync failed: 403 Forbidden",
			errorType: "Error",
		});
	});

	it("stringifies a thrown non-error", () => {
		expect(errorFields("nope")).toEqual({ errorMessage: "nope" });
	});
});

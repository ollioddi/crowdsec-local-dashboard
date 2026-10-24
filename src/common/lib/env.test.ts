import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	vi.resetModules();
});

describe("decision origins configuration", () => {
	it.each([
		[undefined, "crowdsec,cscli"],
		["", undefined],
		['""', undefined],
		["   ", undefined],
		["crowdsec,CAPI", "crowdsec,CAPI"],
	])("maps %j to %j", async (value, expected) => {
		vi.resetModules();
		vi.stubEnv(
			"BETTER_AUTH_SECRET",
			"a-test-secret-that-is-32-characters-long",
		);
		vi.stubEnv("LAPI_DECISION_ORIGINS", value);
		const { env } = await import("./env");
		expect(env.LAPI_DECISION_ORIGINS).toBe(expected);
	});
});

describe("session secret", () => {
	it("rejects a secret shorter than 32 characters", async () => {
		vi.resetModules();
		vi.stubEnv("BETTER_AUTH_SECRET", "changeme");
		const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
		vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});
		await expect(import("./env")).rejects.toThrow("exit");
		expect(String(stderr.mock.calls[0]?.[0])).toMatch(
			/BETTER_AUTH_SECRET: must be at least 32 characters/,
		);
	});
});

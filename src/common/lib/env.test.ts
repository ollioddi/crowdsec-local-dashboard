import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	vi.unstubAllEnvs();
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
		vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
		vi.stubEnv("LAPI_DECISION_ORIGINS", value);
		const { env } = await import("./env");
		expect(env.LAPI_DECISION_ORIGINS).toBe(expected);
	});
});

import { describe, expect, it, vi } from "vitest";

vi.stubEnv("BETTER_AUTH_SECRET", "a-test-secret-that-is-32-characters-long");
const { releasePageUrl } = await import("./latest-release.server");
const { RELEASES_URL } = await import("./version");

describe("releasePageUrl", () => {
	it("keeps this repo's release pages", () => {
		const url = `${RELEASES_URL}/tag/v1.2.3`;
		expect(releasePageUrl(url)).toBe(url);
	});

	it.each([
		"https://evil.example/releases",
		`${RELEASES_URL}.evil.example/x`,
		"javascript:alert(1)",
		undefined,
	])("falls back to the releases page for %j", (url) => {
		expect(releasePageUrl(url)).toBe(RELEASES_URL);
	});
});

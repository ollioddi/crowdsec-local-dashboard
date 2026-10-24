import { describe, expect, it } from "vitest";
import { applyResponseHeaders } from "./response-headers.server";

function html(headers: Record<string, string> = {}) {
	return new Response("<p>hi</p>", {
		headers: { "content-type": "text/html; charset=utf-8", ...headers },
	});
}

describe("applyResponseHeaders", () => {
	it("marks rendered pages no-store", () => {
		const response = applyResponseHeaders(html());
		expect(response.headers.get("cache-control")).toBe("no-store");
	});

	it("keeps a cache-control the route set itself", () => {
		const response = applyResponseHeaders(
			html({ "cache-control": "public, max-age=60" }),
		);
		expect(response.headers.get("cache-control")).toBe("public, max-age=60");
	});

	it("leaves other content types alone", () => {
		const response = applyResponseHeaders(Response.json({ ok: true }));
		expect(response.headers.get("cache-control")).toBeNull();
	});

	it("copies responses whose headers are immutable", () => {
		const redirect = Response.redirect("https://example.com/login", 302);
		const response = applyResponseHeaders(redirect);
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("https://example.com/login");
	});
});

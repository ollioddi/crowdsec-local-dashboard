import { getIP } from "better-auth/api";
import { describe, expect, it } from "vitest";
import { withPeerAddress } from "./client-address.server";

const options = {
	advanced: { ipAddress: { trustedProxies: ["172.16.0.0/12"] } },
};

function fromPeer(peer: string, forwarded?: string) {
	const headers = new Headers();
	if (forwarded) headers.set("x-forwarded-for", forwarded);
	const request = Object.assign(new Request("http://dash/", { headers }), {
		ip: peer,
	});
	return getIP(withPeerAddress(request), options);
}

describe("client address for rate limiting", () => {
	it("ignores a forged header from a client that connects directly", () => {
		expect(fromPeer("198.51.100.4", "203.0.113.99")).toBe("198.51.100.4");
	});

	it("takes the address a trusted proxy forwarded", () => {
		expect(fromPeer("172.18.0.2", "203.0.113.99")).toBe("203.0.113.99");
	});

	it("skips what the client sent in front of a trusted proxy", () => {
		expect(fromPeer("172.18.0.2", "1.2.3.4, 203.0.113.99")).toBe(
			"203.0.113.99",
		);
	});

	it("reads IPv4-mapped socket addresses", () => {
		expect(fromPeer("::ffff:172.18.0.2", "203.0.113.99")).toBe("203.0.113.99");
	});
});

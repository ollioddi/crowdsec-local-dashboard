import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
	user: { create: vi.fn(), findUnique: vi.fn() },
	account: { create: vi.fn() },
}));

const testEnv = vi.hoisted(() => ({
	BETTER_AUTH_SECRET: "a-long-test-secret-for-public-signup-regression",
	BETTER_AUTH_URL: "http://localhost:3000",
	SIGN_IN_RATE_LIMIT_MAX: 5,
	SIGN_IN_RATE_LIMIT_WINDOW: 60,
}));

vi.mock("@/common/lib/db", () => ({ prisma: db }));
vi.mock("@/common/lib/env", () => ({ env: testEnv }));
vi.mock("better-auth/adapters/prisma", async () => {
	const { memoryAdapter } = await import("better-auth/adapters/memory");
	return {
		prismaAdapter: () =>
			memoryAdapter({ user: [], session: [], account: [], verification: [] }),
	};
});

import { auth } from "./auth.server";
import { createUserAccount } from "./create-user-account.server";

beforeEach(() => vi.clearAllMocks());

describe("local account registration", () => {
	it.each([undefined, "outsider"])(
		"rejects anonymous email signup with username %j",
		async (username) => {
			const response = await auth.handler(
				new Request("http://localhost:3000/api/auth/sign-up/email", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						origin: "http://localhost:3000",
					},
					body: JSON.stringify({
						name: "Outsider",
						email: "outsider@example.com",
						password: "long-enough-password",
						...(username ? { username } : {}),
					}),
				}),
			);
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({
				code: "EMAIL_PASSWORD_SIGN_UP_DISABLED",
			});
			expect(db.user.create).not.toHaveBeenCalled();
			expect(db.account.create).not.toHaveBeenCalled();
		},
	);

	it("still lets setup and authenticated management create credential accounts directly", async () => {
		await createUserAccount(
			"managed",
			"long-enough-password",
			"managed@example.com",
		);
		expect(db.user.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				username: "managed",
				email: "managed@example.com",
			}),
		});
		const { data } = db.account.create.mock.calls[0][0];
		expect(data.providerId).toBe("credential");
		expect(data.password).not.toBe("long-enough-password");
		expect(
			await (await auth.$context).password.verify({
				hash: data.password,
				password: "long-enough-password",
			}),
		).toBe(true);
	});
});

describe("sign-in rate limit", () => {
	// 401: attempt allowed, wrong password. 429: blocked by the rate limit.
	const MAX = testEnv.SIGN_IN_RATE_LIMIT_MAX;
	const ALLOWED: number[] = Array(MAX).fill(401);

	// A failed sign-in from the given IP
	const signIn = async (ip: string) =>
		auth.handler(
			new Request("http://localhost:3000/api/auth/sign-in/username", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "http://localhost:3000",
					"x-forwarded-for": ip,
				},
				body: JSON.stringify({
					username: "nobody",
					password: "wrong-password-guess",
				}),
			}),
		);

	const statusesFor = async (ip: string, attempts: number) => {
		const statuses: number[] = [];
		for (let i = 0; i < attempts; i++) statuses.push((await signIn(ip)).status);
		return statuses;
	};

	// Counters carry over between tests, so each test uses its own IP
	afterEach(() => vi.useRealTimers());

	it("lets exactly the allowed attempts through, then refuses the next", async () => {
		expect(await statusesFor("203.0.113.1", MAX + 1)).toEqual([
			...ALLOWED,
			429,
		]);
	});

	it("does not limit a different IP", async () => {
		expect(await statusesFor("203.0.113.2", MAX + 1)).toEqual([
			...ALLOWED,
			429,
		]);

		// Another IP is not affected
		expect(await statusesFor("203.0.113.3", 1)).toEqual([401]);
	});

	it("lets the IP in again once X-Retry-After has passed", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		const ip = "203.0.113.4";
		expect(await statusesFor(ip, MAX)).toEqual(ALLOWED);

		const limited = await signIn(ip);
		expect(limited.status).toBe(429);
		const retryAfterSeconds = Number(limited.headers.get("X-Retry-After"));
		// Never longer than the window
		expect(retryAfterSeconds).toBeGreaterThan(0);
		expect(retryAfterSeconds).toBeLessThanOrEqual(
			testEnv.SIGN_IN_RATE_LIMIT_WINDOW,
		);

		// One second early: still blocked
		vi.advanceTimersByTime((retryAfterSeconds - 1) * 1000);
		expect((await signIn(ip)).status).toBe(429);

		// On time: allowed again
		vi.advanceTimersByTime(1000);
		expect((await signIn(ip)).status).toBe(401);
	});
});

it("does not tell anonymous visitors which usernames exist", async () => {
	const response = await auth.handler(
		new Request("http://localhost:3000/api/auth/is-username-available", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "http://localhost:3000",
			},
			body: JSON.stringify({ username: "admin" }),
		}),
	);
	expect(response.status).toBe(404);
});

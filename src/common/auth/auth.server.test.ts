import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
	user: { create: vi.fn(), findUnique: vi.fn() },
	account: { create: vi.fn() },
}));

vi.mock("@/common/lib/db", () => ({ prisma: db }));
vi.mock("@/common/lib/env", () => ({
	env: {
		BETTER_AUTH_SECRET: "a-long-test-secret-for-public-signup-regression",
		BETTER_AUTH_URL: "http://localhost:3000",
	},
}));
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

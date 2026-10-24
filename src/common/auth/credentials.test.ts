import { describe, expect, it } from "vitest";
import { firstAdminSchema, signInSchema } from "./credentials";

describe("credential rules", () => {
	it("rejects passwords under 12 characters for new accounts", () => {
		const result = firstAdminSchema.safeParse({
			setupCode: "ABCD-EFGH-JKMN",
			username: "admin",
			password: "short-pass",
		});
		expect(result.success).toBe(false);
	});

	it.each(["ab", "has space", "x".repeat(31), "evil<script>"])(
		"rejects the username %j",
		(username) => {
			const result = firstAdminSchema.safeParse({
				setupCode: "ABCD-EFGH-JKMN",
				username,
				password: "a-long-enough-passphrase",
			});
			expect(result.success).toBe(false);
		},
	);

	it("accepts mixed case usernames, which setup lowercases", () => {
		const result = firstAdminSchema.safeParse({
			setupCode: "ABCD-EFGH-JKMN",
			username: "Oliver.R_1",
			password: "a-long-enough-passphrase",
		});
		expect(result.success).toBe(true);
	});

	it("still lets older short passwords sign in", () => {
		expect(
			signInSchema.safeParse({ username: "old", password: "abcd" }).success,
		).toBe(true);
	});

	it("caps sign-in input size", () => {
		expect(
			signInSchema.safeParse({ username: "old", password: "x".repeat(129) })
				.success,
		).toBe(false);
	});
});

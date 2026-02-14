/**
 * Server-only user utilities.
 *
 * This module uses Prisma and Better Auth directly, so it must NEVER be
 * statically imported by client-side code. Only import it dynamically
 * inside createServerFn handlers.
 */

import { prisma } from "@/db";
import { auth } from "@/lib/auth.server";

/**
 * Creates a user record and its associated credential account.
 * Callers are responsible for resolving the email fallback and
 * normalising the username before calling this.
 */
export async function createUserAccount(
	username: string,
	password: string,
	email: string,
): Promise<void> {
	const ctx = await auth.$context;
	const hash = await ctx.password.hash(password);
	const userId = globalThis.crypto.randomUUID();

	await prisma.user.create({
		data: {
			id: userId,
			name: username,
			email,
			username,
			displayUsername: username,
		},
	});

	await prisma.account.create({
		data: {
			id: globalThis.crypto.randomUUID(),
			userId,
			accountId: userId,
			providerId: "credential",
			password: hash,
		},
	});
}

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import z from "zod";
import type { Session } from "@/lib/auth.server";

export const loginSchema = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(4, "Password is required"),
});

/**
 * Server function to get the current session.
 * Returns the session if authenticated, null otherwise.
 */
export const getSessionFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<Session | null> => {
		const { auth } = await import("@/lib/auth.server");
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		return session;
	},
);

/**
 * Returns true if no users exist yet (first-time setup).
 */
export const isFirstSetupFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<boolean> => {
		const { prisma } = await import("@/db");
		const count = await prisma.user.count();
		return count === 0;
	},
);

/**
 * Ensures at least one admin user exists, then signs in.
 * On first login: creates the user with the given credentials.
 * On subsequent logins: signs in with existing credentials.
 */
export const ensureAdminAndSignInFn = createServerFn({ method: "POST" })
	.inputValidator(loginSchema)
	.handler(async ({ data }) => {
		const { auth } = await import("@/lib/auth.server");
		const { prisma } = await import("@/db");
		const { createUserAccount } = await import("@/lib/users.server");
		const { SETUP_EMAIL_DOMAIN } = await import("@/lib/users.functions");

		const headers = getRequestHeaders();
		const { username, password } = data;

		const userCount = await prisma.user.count();

		if (userCount === 0) {
			// First user — create admin account directly via Prisma,
			// bypassing signUpEmail which requires a valid email.
			await createUserAccount(
				username,
				password,
				`${username}${SETUP_EMAIL_DOMAIN}`,
			);
		}

		// Sign in with username
		const signInRes = await auth.api.signInUsername({
			body: { username, password },
			headers,
		});

		if (!signInRes) {
			return { error: "Invalid credentials" };
		}

		return { success: true };
	});

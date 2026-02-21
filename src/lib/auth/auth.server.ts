import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "@/db";
import { env } from "@/env";

export const auth = betterAuth({
	// baseURL is intentionally omitted: Better Auth reads BETTER_AUTH_URL from
	// process.env directly, and falls back to inferring from the request origin.
	// Set BETTER_AUTH_URL if cookies or auth redirects break because Node.js sees
	// an internal URL (e.g. http://localhost:3000) instead of the external one.
	secret: env.BETTER_AUTH_SECRET,
	database: prismaAdapter(prisma, { provider: "sqlite" }),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [tanstackStartCookies(), username()],
});

export type Session = typeof auth.$Infer.Session;

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "@/db";
import { env } from "@/env";
import { logger } from "@/lib/logging/logger";

const log = logger("auth");

const oidcConfig: GenericOAuthConfig[] =
	env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET && env.OIDC_ISSUER_URL
		? [
				{
					providerId: "oidc",
					clientId: env.OIDC_CLIENT_ID,
					clientSecret: env.OIDC_CLIENT_SECRET,
					discoveryUrl: `${env.OIDC_ISSUER_URL.replace(/\/$/, "")}/.well-known/openid-configuration`,
					scopes: ["openid", "email", "profile"],
					pkce: true,
					mapProfileToUser: (profile) => {
						const preferred =
							(profile.preferred_username as string | undefined) ??
							(profile.nickname as string | undefined) ??
							(profile.name as string | undefined)?.split(" ")[0];
						// username/displayUsername are added by the username plugin;
						// OAuthMappedUser allows extra keys via its index signature.
						return {
							username: preferred?.toLowerCase(),
							displayUsername: preferred,
						};
					},
				},
			]
		: [];

export const auth = betterAuth({
	// baseURL is intentionally omitted: Better Auth reads BETTER_AUTH_URL from
	// process.env directly, and falls back to inferring from the request origin.
	// Set BETTER_AUTH_URL if cookies or auth redirects break because Node.js sees
	// an internal URL (e.g. http://localhost:3000) instead of the external one.
	secret: env.BETTER_AUTH_SECRET,
	database: prismaAdapter(prisma, { provider: "sqlite" }),
	advanced: {
		// The dashboard runs behind a reverse proxy; without this the origin
		// check compares against the container's own URL and rejects logins.
		trustedProxyHeaders: true,
	},
	emailAndPassword: {
		enabled: true,
	},
	logger: {
		level: "warn",
		log: (level, message, ...args) => log[level](message, { args }),
	},
	databaseHooks: {
		session: {
			create: {
				after: async (session) => {
					const user = await prisma.user.findUnique({
						where: { id: session.userId },
						select: { username: true },
					});
					log.info("{username} signed in", {
						username: user?.username ?? session.userId,
					});
				},
			},
		},
	},
	plugins: [
		tanstackStartCookies(),
		username(),
		genericOAuth({ config: oidcConfig }),
	],
});

export type Session = typeof auth.$Infer.Session;

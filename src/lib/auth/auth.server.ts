import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "@/db";
import { env } from "@/env";

const oidcConfig =
	env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET && env.OIDC_ISSUER_URL
		? [
				{
					providerId: "oidc",
					clientId: env.OIDC_CLIENT_ID,
					clientSecret: env.OIDC_CLIENT_SECRET,
					discoveryUrl: `${env.OIDC_ISSUER_URL.replace(/\/$/, "")}/.well-known/openid-configuration`,
					scopes: ["openid", "email", "profile"],
					pkce: true,
					mapProfileToUser: (profile: Record<string, unknown>) => {
						const preferred =
							(profile.preferred_username as string | undefined) ??
							(profile.nickname as string | undefined) ??
							(profile.name as string | undefined)?.split(" ")[0];
						// Cast needed: username/displayUsername are added by the username
						// plugin and are not reflected in the base mapProfileToUser types.
						return {
							username: preferred?.toLowerCase(),
							displayUsername: preferred,
						} as Parameters<
							NonNullable<
								Parameters<typeof genericOAuth>[0]["config"][number]["mapProfileToUser"]
							>
						>[0] extends infer _P
							? Record<string, unknown>
							: never;
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
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		tanstackStartCookies(),
		username(),
		genericOAuth({ config: oidcConfig }),
	],
});

export type Session = typeof auth.$Infer.Session;

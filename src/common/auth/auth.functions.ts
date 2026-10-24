import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { Session } from "@/common/auth/auth.server";
import { firstAdminSchema } from "@/common/auth/credentials";
import { SETUP_EMAIL_DOMAIN } from "@/common/auth/email-domains";
import { errorFields, logger } from "@/common/lib/logging/logger";

const log = logger("auth");

/**
 * Server function to get the current session.
 * Returns the session if authenticated, null otherwise.
 */
export const getSessionFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<Session | null> => {
		const { auth, warnIfCookieNotSecure } = await import(
			"@/common/auth/auth.server"
		);
		const headers = getRequestHeaders();
		warnIfCookieNotSecure(headers);
		const session = await auth.api.getSession({ headers });
		return session;
	},
);

/** Rate limit window, for the login countdown. */
export const getSignInWindowFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<number> => {
		const { env } = await import("@/common/lib/env");
		return env.SIGN_IN_RATE_LIMIT_WINDOW;
	},
);

/**
 * Returns true if no users exist yet (first-time setup).
 */
export const isFirstSetupFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<boolean> => {
		const { prisma } = await import("@/common/lib/db");
		const count = await prisma.user.count();
		return count === 0;
	},
);

type OidcConfig =
	| { enabled: false }
	| { enabled: true; buttonLabel: string; autoRedirect: boolean };

/**
 * Returns OIDC SSO configuration derived from environment variables.
 */
export const getOidcConfigFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<OidcConfig> => {
		const { env } = await import("@/common/lib/env");
		const enabled = !!(
			env.OIDC_CLIENT_ID &&
			env.OIDC_CLIENT_SECRET &&
			env.OIDC_ISSUER_URL
		);
		if (!enabled) return { enabled: false };
		return {
			enabled: true,
			buttonLabel: env.OIDC_BUTTON_LABEL ?? "Sign in with SSO",
			autoRedirect: env.OIDC_AUTO_REDIRECT ?? false,
		};
	},
);

/** Creates the first account. The client signs in afterwards. */
export const createFirstAdminFn = createServerFn({ method: "POST" })
	.validator(firstAdminSchema)
	.handler(async ({ data }) => {
		const { prisma } = await import("@/common/lib/db");
		const { createUserAccount } = await import(
			"@/common/auth/create-user-account.server"
		);
		const { claimSetupCode } = await import("@/common/auth/setup-code.server");

		if ((await prisma.user.count()) > 0) {
			return { error: "Setup is already complete. Sign in instead." };
		}
		const restoreCode = claimSetupCode(data.setupCode);
		if (!restoreCode) {
			log.warn("First account refused: wrong setup code");
			return { error: "That setup code is not right. Check the log again." };
		}

		const username = data.username.toLowerCase();
		try {
			await createUserAccount(
				username,
				data.password,
				`${username}${SETUP_EMAIL_DOMAIN}`,
			);
		} catch (error) {
			restoreCode();
			log.error(
				"First account could not be created: {errorMessage}",
				errorFields(error),
			);
			return { error: "The account could not be created. Try again." };
		}
		log.info("{username} is the first user and becomes admin", { username });
		return { username };
	});

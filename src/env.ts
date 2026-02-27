import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1).default("file:./dev.db"),
		// Optional: Better Auth infers the base URL from the request origin.
		// Set this only if you are behind a reverse proxy where the inferred origin
		// would be incorrect (e.g. BETTER_AUTH_URL=https://dashboard.example.com).
		BETTER_AUTH_URL: z.url().optional(),
		BETTER_AUTH_SECRET: z.string().min(1),
		SERVER_URL: z.url().optional(),
		LAPI_URL: z.url().optional(),
		LAPI_MACHINE_ID: z.string().min(1).optional(),
		LAPI_MACHINE_PASSWORD: z.string().min(1).optional(),
		LAPI_BOUNCER_API_TOKEN: z.string().min(1).optional(),
		LAPI_POLL_INTERVAL: z.coerce.number().positive().default(60),
		DECISION_RETENTION_COUNT: z.coerce.number().positive().optional(),
		// OIDC/OAuth SSO (optional — leave unset to disable SSO login)
		OIDC_CLIENT_ID: z.string().min(1).optional(),
		OIDC_CLIENT_SECRET: z.string().min(1).optional(),
		OIDC_ISSUER_URL: z.url().optional(),
		OIDC_BUTTON_LABEL: z.string().min(1).optional(),
		OIDC_AUTO_REDIRECT: z.preprocess(
			(val) =>
				val === "false" || val === "0"
					? false
					: val === "true" || val === "1"
						? true
						: val,
			z.boolean().optional(),
		),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
	},

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	runtimeEnv: Object.fromEntries(
		Object.entries(process.env).map(([k, v]) => [
			k,
			typeof v === "string" ? v.replaceAll(/^"|"$/g, "") : v,
		]),
	),

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});

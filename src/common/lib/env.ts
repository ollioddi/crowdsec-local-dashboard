import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { LOG_FORMATS, LOG_LEVELS } from "@/common/lib/logging/levels";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1).default("file:./dev.db"),
		// Optional: Better Auth infers the base URL from the request origin.
		// Set this only if you are behind a reverse proxy where the inferred origin
		// would be incorrect (e.g. BETTER_AUTH_URL=https://dashboard.example.com).
		BETTER_AUTH_URL: z.url().optional(),
		BETTER_AUTH_SECRET: z.string().min(1),
		LAPI_URL: z.url().optional(),
		LAPI_MACHINE_ID: z.string().min(1).optional(),
		LAPI_MACHINE_PASSWORD: z.string().min(1).optional(),
		LAPI_BOUNCER_API_TOKEN: z.string().min(1).optional(),
		LAPI_POLL_INTERVAL: z.coerce.number().positive().default(60),
		// Empty explicitly selects all origins, including CAPI and blocklists.
		LAPI_DECISION_ORIGINS: z
			.string()
			.default("crowdsec,cscli")
			.transform((value) => value.trim() || undefined),
		// Alerts requested per host. LAPI defaults to 100 when omitted.
		LAPI_ALERT_LIMIT: z.coerce.number().int().positive().default(100),
		// Oldest inactive pruned first. 0 keeps everything.
		DECISION_RETENTION_COUNT: z.coerce.number().int().min(0).default(20000),
		// Applied before the count limit. 0 disables.
		DECISION_RETENTION_DAYS: z.coerce.number().int().min(0).default(0),
		LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
		LOG_FORMAT: z.enum(LOG_FORMATS).default("human"),
		UPDATE_CHECK: z.stringbool().default(true),
		// OIDC/OAuth SSO (optional; leave unset to disable SSO login)
		OIDC_CLIENT_ID: z.string().min(1).optional(),
		OIDC_CLIENT_SECRET: z.string().min(1).optional(),
		OIDC_ISSUER_URL: z.url().optional(),
		OIDC_BUTTON_LABEL: z.string().min(1).optional(),
		OIDC_AUTO_REDIRECT: z.stringbool().optional(),
	},

	// Empty values normally mean “unset”. Origins are the exception: an
	// explicitly empty list asks LAPI for every origin.
	runtimeEnv: Object.fromEntries(
		Object.entries(process.env).map(([key, raw]) => {
			const value = raw?.replaceAll(/^"|"$/g, "");
			if (value === "" && key !== "LAPI_DECISION_ORIGINS") {
				return [key, undefined];
			}
			return [key, value];
		}),
	),
	emptyStringAsUndefined: false,

	// Name the offending variables, then stop: a server answering 500 to every
	// request hides the cause behind a generic message.
	onValidationError: (issues) => {
		const details = issues.map((issue) => {
			const path = issue.path?.map((segment) =>
				typeof segment === "object" ? String(segment.key) : String(segment),
			);
			return `  ${path?.join(".") ?? "?"}: ${issue.message}`;
		});
		const message = `Invalid environment variables:\n${details.join("\n")}`;
		if (typeof process !== "undefined" && typeof process.exit === "function") {
			process.stderr.write(`${message}\n`);
			process.exit(1);
		}
		throw new Error(message);
	},
});

import { auth } from "@/common/auth/auth.server";
import { getLapiClient } from "@/common/crowdsec-lapi/get-lapi-client";
import { prisma } from "@/common/lib/db";
import { env } from "@/common/lib/env";
import { logger } from "@/common/lib/logging/logger";
import { isServerReady } from "@/common/lib/server-state.server";
import { getSyncStatus } from "@/features/sync/lib/status";

const log = logger("health");

// Anyone can call /readyz, so LAPI is checked at most this often
const LAPI_PROBE_TTL_MS = 30_000;

let lapiProbe: { startedAt: number; reason: Promise<string | null> } | null =
	null;

function unavailable(reason: string): Response {
	return Response.json(
		{ status: "error", reason },
		{ status: 503, headers: { "cache-control": "no-store" } },
	);
}

function ok(): Response {
	return Response.json(
		{ status: "ok" },
		{ headers: { "cache-control": "no-store" } },
	);
}

export async function getHealthResponse(): Promise<Response> {
	try {
		// Check the provider Better Auth actually registered, not just the
		// environment or discovery URL: a failed lookup is cached until restart.
		const context = await auth.$context;
		if (
			env.OIDC_CLIENT_ID &&
			env.OIDC_CLIENT_SECRET &&
			env.OIDC_ISSUER_URL &&
			!context.socialProviders.some((provider) => provider.id === "oidc")
		) {
			return unavailable("oidc_provider_unavailable");
		}
	} catch {
		return unavailable("auth_initialization_failed");
	}
	return ok();
}

export async function getReadinessResponse(): Promise<Response> {
	if (!isServerReady()) return unavailable("server_not_ready");
	const health = await getHealthResponse();
	if (!health.ok) return health;
	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch {
		return unavailable("database_unavailable");
	}
	const sync = getSyncStatus();
	if (sync.configured) {
		if (!sync.lastSuccessAt) return unavailable("lapi_sync_pending");
		if (sync.error) return unavailable("lapi_sync_failed");
		const reason = await cachedLapiProbe();
		if (reason) return unavailable(reason);
	}
	return ok();
}

async function probeLapi(): Promise<string | null> {
	try {
		const client = getLapiClient();
		const connection = await client.checkConnectionHealth();
		if (connection.status !== "OK") return "lapi_unavailable";
		if (client.canFetchAlerts) {
			try {
				await client.getAlerts({ limit: 1 });
			} catch {
				return "lapi_watcher_unavailable";
			}
		}
	} catch {
		return "lapi_unavailable";
	}
	return null;
}

/** Reuses one LAPI check for the whole window. */
function cachedLapiProbe(): Promise<string | null> {
	const now = Date.now();
	if (lapiProbe && now - lapiProbe.startedAt < LAPI_PROBE_TTL_MS) {
		return lapiProbe.reason;
	}
	const reason = probeLapi().then((result) => {
		if (result)
			log.warn("Readiness probe failed: {reason}", { reason: result });
		return result;
	});
	lapiProbe = { startedAt: now, reason };
	return reason;
}

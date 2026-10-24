import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	env: {
		BETTER_AUTH_SECRET: "a-long-test-secret-for-oidc-health-regression",
		BETTER_AUTH_URL: "http://localhost:3000",
		OIDC_CLIENT_ID: undefined as string | undefined,
		OIDC_CLIENT_SECRET: undefined as string | undefined,
		OIDC_ISSUER_URL: undefined as string | undefined,
	},
	fetch: vi.fn<typeof fetch>(),
	prismaAdapter: vi.fn(),
	query: vi.fn(),
	serverReady: true,
	failAuthInitialization: false,
	sync: {
		configured: false,
		lastSuccessAt: null as string | null,
		error: null as string | null,
	},
	lapi: {
		canFetchAlerts: false,
		checkConnectionHealth: vi.fn(),
		getAlerts: vi.fn(),
	},
}));

vi.mock("@/common/lib/env", () => ({ env: mocks.env }));
vi.mock("@/common/lib/db", () => ({ prisma: { $queryRaw: mocks.query } }));
vi.mock("@/common/lib/server-state.server", () => ({
	isServerReady: () => mocks.serverReady,
}));
vi.mock("@/features/sync/lib/status", () => ({
	getSyncStatus: () => mocks.sync,
}));
vi.mock("@/common/crowdsec-lapi/get-lapi-client", () => ({
	getLapiClient: () => mocks.lapi,
}));
vi.mock("better-auth/plugins", async (importOriginal) => {
	const original = await importOriginal<typeof import("better-auth/plugins")>();
	return {
		...original,
		genericOAuth: (...args: Parameters<typeof original.genericOAuth>) => {
			const plugin = original.genericOAuth(...args);
			return mocks.failAuthInitialization
				? {
						...plugin,
						init: async () => {
							throw new Error("private auth details");
						},
					}
				: plugin;
		},
	};
});
vi.mock("@/common/lib/logging/logger", () => ({
	logger: () => ({ warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("better-auth/adapters/prisma", () => ({
	prismaAdapter: mocks.prismaAdapter,
}));

const issuer = "https://idp.example.com/application/o/dashboard";
const discovery = {
	issuer,
	authorization_endpoint: `${issuer}/authorize`,
	token_endpoint: `${issuer}/token`,
	userinfo_endpoint: `${issuer}/userinfo`,
	jwks_uri: `${issuer}/jwks`,
	id_token_signing_alg_values_supported: ["RS256"],
};

beforeEach(async () => {
	vi.resetModules();
	vi.clearAllMocks();
	mocks.serverReady = true;
	mocks.failAuthInitialization = false;
	mocks.query.mockResolvedValue([{ "1": 1 }]);
	Object.assign(mocks.sync, {
		configured: false,
		lastSuccessAt: null,
		error: null,
	});
	mocks.lapi.canFetchAlerts = false;
	mocks.lapi.checkConnectionHealth.mockResolvedValue({
		status: "OK",
		error: null,
	});
	mocks.lapi.getAlerts.mockResolvedValue([]);
	Object.assign(mocks.env, {
		OIDC_CLIENT_ID: undefined,
		OIDC_CLIENT_SECRET: undefined,
		OIDC_ISSUER_URL: undefined,
	});
	const { memoryAdapter } = await import("better-auth/adapters/memory");
	mocks.prismaAdapter.mockImplementation(() =>
		memoryAdapter({ user: [], session: [], account: [], verification: [] }),
	);
	vi.stubGlobal("fetch", mocks.fetch);
});

afterEach(() => vi.unstubAllGlobals());

function configureOidc() {
	Object.assign(mocks.env, {
		OIDC_CLIENT_ID: "dashboard",
		OIDC_CLIENT_SECRET: "test-client-secret",
		OIDC_ISSUER_URL: issuer,
	});
}

describe("dashboard health", () => {
	it("returns 200 after local auth initializes when SSO is disabled", async () => {
		const { getHealthResponse } = await import("./health.server");
		const response = await getHealthResponse();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
		expect(mocks.prismaAdapter).toHaveBeenCalledTimes(1);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("returns 200 after OIDC discovery registers the provider", async () => {
		configureOidc();
		mocks.fetch.mockImplementation(async () => Response.json(discovery));
		const { getHealthResponse } = await import("./health.server");
		expect((await getHealthResponse()).status).toBe(200);
		expect((await getHealthResponse()).status).toBe(200);
		expect(mocks.fetch).toHaveBeenCalledTimes(1);
		expect(String(mocks.fetch.mock.calls[0][0])).toBe(
			`${issuer}/.well-known/openid-configuration`,
		);
	});

	it.each(["network", "http", "invalid discovery"])(
		"stays unhealthy after %s discovery failure even when the provider recovers",
		async (failure) => {
			configureOidc();
			mocks.fetch.mockImplementation(async () => {
				if (failure === "network") throw new TypeError("fetch failed");
				if (failure === "http") return new Response(null, { status: 503 });
				return Response.json({ issuer });
			});
			const { getHealthResponse } = await import("./health.server");
			const response = await getHealthResponse();
			expect(response.status).toBe(503);
			expect(await response.json()).toEqual({
				status: "error",
				reason: "oidc_provider_unavailable",
			});
			mocks.fetch.mockImplementation(async () => Response.json(discovery));
			expect((await getHealthResponse()).status).toBe(503);
			expect(mocks.fetch).toHaveBeenCalledTimes(1);
		},
	);

	it("returns 503 if auth initialization throws without exposing the error", async () => {
		configureOidc();
		mocks.failAuthInitialization = true;
		const { getHealthResponse } = await import("./health.server");
		const response = await getHealthResponse();
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			status: "error",
			reason: "auth_initialization_failed",
		});
	});
});

describe("dashboard readiness", () => {
	it("is ready with optional integrations disabled once startup, auth and database are ready", async () => {
		const { getReadinessResponse } = await import("./health.server");
		const response = await getReadinessResponse();
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(mocks.query).toHaveBeenCalledTimes(1);
		expect(mocks.lapi.checkConnectionHealth).not.toHaveBeenCalled();
	});

	it("is not ready before startup finishes or during shutdown", async () => {
		mocks.serverReady = false;
		const { getReadinessResponse } = await import("./health.server");
		const response = await getReadinessResponse();
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({ reason: "server_not_ready" });
		expect(mocks.query).not.toHaveBeenCalled();
	});

	it("is not ready when configured OIDC was skipped", async () => {
		configureOidc();
		mocks.fetch.mockImplementation(
			async () => new Response(null, { status: 503 }),
		);
		const { getReadinessResponse } = await import("./health.server");
		const response = await getReadinessResponse();
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			reason: "oidc_provider_unavailable",
		});
	});

	it("detects a database failure and recovers on the next probe", async () => {
		mocks.query.mockRejectedValueOnce(new Error("private database details"));
		const { getReadinessResponse } = await import("./health.server");
		const response = await getReadinessResponse();
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			status: "error",
			reason: "database_unavailable",
		});
		expect((await getReadinessResponse()).status).toBe(200);
	});

	it.each([
		{ lastSuccessAt: null, error: null, reason: "lapi_sync_pending" },
		{
			lastSuccessAt: "2026-10-13T10:00:00Z",
			error: "sync failed",
			reason: "lapi_sync_failed",
		},
	])(
		"waits for a healthy sync: $reason",
		async ({ lastSuccessAt, error, reason }) => {
			Object.assign(mocks.sync, { configured: true, lastSuccessAt, error });
			const { getReadinessResponse } = await import("./health.server");
			const response = await getReadinessResponse();
			expect(response.status).toBe(503);
			expect(await response.json()).toMatchObject({ reason });
			expect(mocks.lapi.checkConnectionHealth).not.toHaveBeenCalled();
		},
	);

	it("checks LAPI connectivity after sync succeeds and detects a later outage", async () => {
		Object.assign(mocks.sync, {
			configured: true,
			lastSuccessAt: new Date().toISOString(),
		});
		const { getReadinessResponse } = await import("./health.server");
		expect((await getReadinessResponse()).status).toBe(200);
		mocks.lapi.checkConnectionHealth.mockResolvedValue({
			status: "ERROR",
			error: "INVALID_API_TOKEN",
		});
		const response = await getReadinessResponse();
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({ reason: "lapi_unavailable" });
	});

	it("verifies configured watcher credentials even when there are no decisions", async () => {
		Object.assign(mocks.sync, {
			configured: true,
			lastSuccessAt: new Date().toISOString(),
		});
		mocks.lapi.canFetchAlerts = true;
		mocks.lapi.getAlerts.mockRejectedValueOnce(
			new Error("Watcher login failed"),
		);
		const { getReadinessResponse } = await import("./health.server");
		const response = await getReadinessResponse();
		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({
			reason: "lapi_watcher_unavailable",
		});
		expect(mocks.lapi.getAlerts).toHaveBeenCalledWith({ limit: 1 });
		expect((await getReadinessResponse()).status).toBe(200);
	});
});

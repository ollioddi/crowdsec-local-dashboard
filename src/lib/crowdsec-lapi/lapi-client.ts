import {
	type AlertFilters,
	type ConnectionHealth,
	type CrowdSecAlert,
	type CrowdSecDecision,
	type DecisionStreamResponse,
	type DeleteDecisionResponse,
	type LapiConfig,
	LapiConfigSchema,
	type WatcherAuthResponse,
} from "./types";

/** Query filters accepted by `GET /v1/decisions`. All fields are optional. */
export type DecisionFilters = {
	scope?: string;
	value?: string;
	type?: string;
	ip?: string;
	range?: string;
	origins?: string;
};

/**
 * HTTP client for the CrowdSec Local API (LAPI).
 *
 * Two auth modes are supported:
 * - **Bouncer** (`X-Api-Key`): read-only endpoints like listing decisions.
 * - **Watcher** (JWT bearer): mutating endpoints like deleting decisions.
 *   Requires `machineId` + `machinePassword` in config. The JWT is fetched
 *   lazily on first use and refreshed automatically 60 s before expiry.
 */
export class LapiClient {
	private readonly userAgent = "crowdsec-dashboard/0.1.0";
	private readonly lapiUrl: string;
	private readonly bouncerApiToken: string;
	private readonly machineId?: string;
	private readonly machinePassword?: string;

	private watcherToken: string | null = null;
	private tokenExpiry = 0;

	constructor(config: LapiConfig) {
		const result = LapiConfigSchema.safeParse(config);
		if (!result.success) {
			throw result.error;
		}

		this.lapiUrl = result.data.url.replace(/\/+$/, "");
		this.bouncerApiToken = result.data.bouncerApiToken;
		this.machineId = result.data.machineId;
		this.machinePassword = result.data.machinePassword;
	}

	// --- Private helpers ---

	private get commonHeaders(): Record<string, string> {
		return {
			"Content-Type": "application/json",
			"User-Agent": this.userAgent,
		};
	}

	/** Authenticates as a watcher and stores the resulting JWT + expiry. */
	private async loginWatcher(): Promise<void> {
		if (!this.machineId || !this.machinePassword) {
			throw new Error(
				"Watcher credentials (machineId + machinePassword) are required for this operation",
			);
		}

		const response = await fetch(`${this.lapiUrl}/v1/watchers/login`, {
			method: "POST",
			headers: this.commonHeaders,
			body: JSON.stringify({
				machine_id: this.machineId,
				password: this.machinePassword,
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Watcher login failed: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as WatcherAuthResponse;
		this.watcherToken = data.token;
		this.tokenExpiry = new Date(data.expire).getTime();
	}

	/** Returns a valid watcher JWT, refreshing it if missing or near-expiry. */
	private async getWatcherToken(): Promise<string> {
		const now = Date.now();
		if (!this.watcherToken || now >= this.tokenExpiry - 60_000) {
			await this.loginWatcher();
		}
		// biome-ignore lint/style/noNonNullAssertion: Its safe here because we just set it in loginWatcher
		return this.watcherToken!;
	}

	/** Base fetch that merges common headers with a caller-supplied auth header. */
	private async apiFetch(
		path: string,
		authHeader: Record<string, string>,
		init?: RequestInit,
	): Promise<Response> {
		return fetch(`${this.lapiUrl}${path}`, {
			...init,
			headers: {
				...this.commonHeaders,
				...authHeader,
				...init?.headers,
			},
		});
	}

	/** Fetch using bouncer (API key) auth — for read-only endpoints. */
	private async bouncerFetch(
		path: string,
		init?: RequestInit,
	): Promise<Response> {
		return this.apiFetch(path, { "X-Api-Key": this.bouncerApiToken }, init);
	}

	/** Fetch using watcher (JWT) auth — for mutating endpoints. */
	private async watcherFetch(
		path: string,
		init?: RequestInit,
	): Promise<Response> {
		const token = await this.getWatcherToken();
		return this.apiFetch(path, { Authorization: `Bearer ${token}` }, init);
	}

	// --- Public methods ---

	/**
	 * Verifies connectivity and API key validity by issuing a HEAD request.
	 * Never throws — returns a structured `ConnectionHealth` result instead.
	 */
	public async checkConnectionHealth(): Promise<ConnectionHealth> {
		try {
			const response = await this.bouncerFetch("/v1/decisions", {
				method: "HEAD",
			});

			if (!response.ok) {
				if (response.status === 403) {
					return { status: "ERROR", error: "INVALID_API_TOKEN" };
				}
				if (response.status >= 500) {
					return { status: "ERROR", error: "SECURITY_ENGINE_SERVER_ERROR" };
				}
				return { status: "ERROR", error: "UNEXPECTED_STATUS" };
			}

			return { status: "OK", error: null };
		} catch (error) {
			console.error("Error connecting to LAPI:", error);
			return { status: "ERROR", error: "SECURITY_ENGINE_UNREACHABLE" };
		}
	}

	/**
	 * Fetches the current active decisions, optionally filtered.
	 * Returns `null` when LAPI has no decisions (the API itself returns null).
	 */
	public async getDecisions(
		params?: DecisionFilters,
	): Promise<CrowdSecDecision[] | null> {
		const searchParams = new URLSearchParams();
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined) {
					searchParams.set(key, value);
				}
			}
		}

		const query = searchParams.toString();
		const queryString = query ? `?${query}` : "";
		const path = `/v1/decisions${queryString}`;

		const response = await this.bouncerFetch(path);

		if (!response.ok) {
			throw new Error(
				`Failed to fetch decisions: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as CrowdSecDecision[] | null;
		return data;
	}

	/**
	 * Fetches the decision stream, which returns new and deleted decisions
	 * since the last poll. Pass `startup: true` on the first call to receive
	 * the full current state rather than just the delta.
	 */
	public async getDecisionStream(options?: {
		startup?: boolean;
		origins?: string;
		scopes?: string;
	}): Promise<DecisionStreamResponse> {
		const searchParams = new URLSearchParams({
			startup: (options?.startup ?? false).toString(),
		});
		if (options?.origins) searchParams.set("origins", options.origins);
		if (options?.scopes) searchParams.set("scopes", options.scopes);

		const query = searchParams.toString();
		const queryString = query ? `?${query}` : "";
		const response = await this.bouncerFetch(
			`/v1/decisions/stream${queryString}`,
		);

		if (!response.ok) {
			throw new Error(
				`Failed to fetch decision stream: ${response.status} ${response.statusText}`,
			);
		}

		return (await response.json()) as DecisionStreamResponse;
	}

	/**
	 * Deletes a decision by ID via the watcher (JWT) endpoint.
	 * Throws if the request fails or if LAPI reports `nbDeleted=0`
	 * (decision didn't exist).
	 */
	public async deleteDecisionById(id: number): Promise<DeleteDecisionResponse> {
		console.log(`[lapi-client] DELETE ${this.lapiUrl}/v1/decisions/${id}`);

		const response = await this.watcherFetch(`/v1/decisions/${id}`, {
			method: "DELETE",
		});

		console.log(
			`[lapi-client] DELETE response: ${response.status} ${response.statusText}`,
		);

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			console.error(
				`[lapi-client] DELETE failed: ${response.status} — ${body}`,
			);
			throw new Error(
				`Failed to delete decision ${id}: ${response.status} ${response.statusText} — ${body}`,
			);
		}

		const result = (await response.json()) as DeleteDecisionResponse;
		console.log(`[lapi-client] DELETE result: nbDeleted=${result.nbDeleted}`);

		if (Number.parseInt(result.nbDeleted, 10) === 0) {
			throw new Error(`Decision ${id} was not found in LAPI (nbDeleted=0)`);
		}

		return result;
	}

	/**
	 * Fetches alerts, which contain the specific logs/events that triggered a decision.
	 * Requires Watcher credentials (machineId + password).
	 */
	public async getAlerts(params?: AlertFilters): Promise<CrowdSecAlert[]> {
		const searchParams = new URLSearchParams();
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined) searchParams.set(key, String(value));
			}
		}
		// GET /alerts requires Watcher (JWT) auth
		const response = await this.watcherFetch(
			`/v1/alerts?${searchParams.toString()}`,
		);
		if (!response.ok) throw new Error(`Failed to fetch alerts`);
		const result = await response.json();
		// LAPI returns null (not []) when there are no matching alerts
		return (result as CrowdSecAlert[] | null) ?? [];
	}
}

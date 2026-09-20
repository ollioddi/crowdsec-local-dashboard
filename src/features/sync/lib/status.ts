import { env } from "@/common/lib/env";
import { broadcastEvent } from "@/common/lib/sse.server";

/** Alerts use watcher auth and can fail while decisions sync fine. */
export type AlertFetchState = "unknown" | "ok" | "unconfigured" | "failing";

export type SyncStatus = {
	/** False when LAPI_URL / LAPI_BOUNCER_API_TOKEN are not set, so no polling runs. */
	configured: boolean;
	lastAttemptAt: string | null;
	lastSuccessAt: string | null;
	/** Message of the last failure; null when the last attempt succeeded. */
	error: string | null;
	/** Whether the last sync could fetch alert evidence and ASN data. */
	alerts: AlertFetchState;
	/** Why alerts are unavailable; null when they are fine. */
	alertError: string | null;
};

const status: Omit<SyncStatus, "configured"> = {
	lastAttemptAt: null,
	lastSuccessAt: null,
	error: null,
	alerts: "unknown",
	alertError: null,
};

export function getSyncStatus(): SyncStatus {
	// Derived rather than recorded: a stored flag is reset by a dev server
	// module reload, while the boot guard stops boot() setting it again.
	return {
		...status,
		configured: Boolean(env.LAPI_URL && env.LAPI_BOUNCER_API_TOKEN),
	};
}

export function describeError(error: unknown): string {
	if (!(error instanceof Error)) return String(error);
	const cause = (error as { cause?: unknown }).cause;
	return cause instanceof Error
		? `${error.message}: ${cause.message}`
		: error.message;
}

/** Records how the alert fetch went. Broadcast with the next sync result. */
export function recordAlertFetch(result: {
	state: Exclude<AlertFetchState, "unknown">;
	message: string | null;
}): void {
	status.alerts = result.state;
	status.alertError = result.message;
}

export function recordSyncResult(error: unknown | null): void {
	const now = new Date().toISOString();
	status.lastAttemptAt = now;
	if (error == null) {
		status.lastSuccessAt = now;
		status.error = null;
	} else {
		status.error = describeError(error);
	}
	broadcastEvent("sync-status", getSyncStatus());
}

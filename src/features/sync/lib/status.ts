import { broadcastEvent } from "@/common/lib/sse.server";

export type SyncStatus = {
	/** False when LAPI_URL / LAPI_BOUNCER_API_TOKEN are not set, so no polling runs. */
	configured: boolean;
	lastAttemptAt: string | null;
	lastSuccessAt: string | null;
	/** Message of the last failure; null when the last attempt succeeded. */
	error: string | null;
};

const status: SyncStatus = {
	configured: false,
	lastAttemptAt: null,
	lastSuccessAt: null,
	error: null,
};

export function getSyncStatus(): SyncStatus {
	return { ...status };
}

export function markSyncConfigured(): void {
	status.configured = true;
}

export function describeError(error: unknown): string {
	if (!(error instanceof Error)) return String(error);
	const cause = (error as { cause?: unknown }).cause;
	return cause instanceof Error
		? `${error.message}: ${cause.message}`
		: error.message;
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
	broadcastEvent("sync-status", status);
}

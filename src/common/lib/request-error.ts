/** Why a request did not get an answer, in words a toast can show. */
export function describeRequestFailure(error: unknown): string {
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		return "You are offline. Try again when the connection is back.";
	}
	const message = error instanceof Error ? error.message : String(error);
	if (/fetch failed|failed to fetch|load failed|network/i.test(message)) {
		return "Could not reach the dashboard. It may be restarting.";
	}
	return message || "Unknown error";
}

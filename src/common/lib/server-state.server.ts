declare global {
	var __serverReady: boolean | undefined;
}

/** Persists across dev module reloads alongside the server's boot guard. */
export function isServerReady(): boolean {
	return globalThis.__serverReady === true;
}

export function setServerReady(ready: boolean): void {
	globalThis.__serverReady = ready;
}

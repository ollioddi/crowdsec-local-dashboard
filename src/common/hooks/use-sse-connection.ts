import { useEffect, useEffectEvent, useState } from "react";

/**
 * Manages an SSE connection lifecycle. Returns whether the connection is live.
 * The `onMessage` callback receives the already-parsed message data — handle
 * cache updates and toasts there.
 *
 * Reconnects when the page becomes visible again and the browser has closed
 * the stream (e.g. a backgrounded tab on mobile). EventSource retries
 * transient errors on its own; only a fatal HTTP status closes it.
 */
export function useSSEConnection<T>(
	url: string,
	onMessage: (data: T) => void,
): boolean {
	const [connected, setConnected] = useState(false);
	// Always calls the latest onMessage without re-opening the stream
	const handleMessage = useEffectEvent((data: T) => onMessage(data));

	useEffect(() => {
		let eventSource: EventSource | null = null;

		const connect = () => {
			eventSource?.close();
			console.debug("Establishing SSE connection", { url });
			eventSource = new EventSource(url);
			eventSource.onopen = () => setConnected(true);
			eventSource.onerror = () => setConnected(false);
			eventSource.onmessage = (event) => {
				try {
					handleMessage(JSON.parse(event.data) as T);
				} catch {
					// ignore malformed messages
				}
			};
		};

		connect();

		const handleVisibilityChange = () => {
			// Only reconnect if the browser actually dropped the stream
			if (
				document.visibilityState === "visible" &&
				eventSource?.readyState === EventSource.CLOSED
			) {
				connect();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			eventSource?.close();
			eventSource = null;
			setConnected(false);
		};
	}, [url]);

	return connected;
}

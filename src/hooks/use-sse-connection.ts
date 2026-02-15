"use no memo";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages an SSE connection lifecycle. Returns whether the connection is live.
 * The `onMessage` callback receives the already-parsed message data — handle
 * cache updates and toasts there.
 *
 * Automatically reconnects when the page becomes visible again (e.g. after
 * the tab is backgrounded on mobile and the browser kills the connection).
 */
export function useSSEConnection<T>(
	url: string,
	onMessage: (data: T) => void,
): boolean {
	const [connected, setConnected] = useState(false);
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;
	const eventSourceRef = useRef<EventSource | null>(null);

	const connect = useCallback(() => {
		eventSourceRef.current?.close();
		console.debug("Establishing SSE connection", { url });
		const eventSource = new EventSource(url);
		eventSourceRef.current = eventSource;

		eventSource.onopen = () => setConnected(true);
		eventSource.onerror = () => setConnected(false);
		eventSource.onmessage = (event) => {
			try {
				onMessageRef.current(JSON.parse(event.data) as T);
			} catch {
				// ignore malformed messages
			}
		};
	}, [url]);

	useEffect(() => {
		connect();

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				connect();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			eventSourceRef.current?.close();
			eventSourceRef.current = null;
			setConnected(false);
		};
	}, [connect]);

	return connected;
}

"use no memo";
import { useEffect, useRef, useState } from "react";

/**
 * Manages an SSE connection lifecycle. Returns whether the connection is live.
 * The `onMessage` callback receives the already-parsed message data — handle
 * cache updates and toasts there.
 */
export function useSSEConnection<T>(
	url: string,
	onMessage: (data: T) => void,
): boolean {
	const [connected, setConnected] = useState(false);
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	useEffect(() => {
		console.debug("Establishing SSE connection", { url });
		const eventSource = new EventSource(url);

		eventSource.onopen = () => setConnected(true);
		eventSource.onerror = () => setConnected(false);

		eventSource.onmessage = (event) => {
			try {
				onMessageRef.current(JSON.parse(event.data) as T);
			} catch {
				// ignore malformed messages
			}
		};

		return () => {
			eventSource.close();
			setConnected(false);
		};
	}, [url]);

	return connected;
}

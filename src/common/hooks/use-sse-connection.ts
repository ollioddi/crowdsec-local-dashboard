import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useOnline } from "./use-online";

/** Matches the server's ping interval in sse.server.ts. */
const HEARTBEAT_MS = 20_000;
const STALE_AFTER_MS = HEARTBEAT_MS * 2 + 5_000;
const WATCHDOG_INTERVAL_MS = 5_000;

export type SSEStatus = "connecting" | "live" | "down";

/**
 * Opens the stream and reports its state. An idle stream on a dead network
 * never errors, so missed pings count as down, and the browser's own offline
 * verdict closes it outright.
 */
export function useSSEConnection<T>(
	url: string,
	onMessage: (data: T) => void,
): SSEStatus {
	const [status, setStatus] = useState<SSEStatus>("connecting");
	const online = useOnline();
	const source = useRef<EventSource | null>(null);
	const lastSeen = useRef(0);
	const handleMessage = useEffectEvent((data: T) => onMessage(data));

	const connect = useEffectEvent(() => {
		source.current?.close();
		lastSeen.current = Date.now();
		setStatus("connecting");
		const eventSource = new EventSource(url);
		eventSource.onopen = () => {
			lastSeen.current = Date.now();
			setStatus("live");
		};
		eventSource.onerror = () => setStatus("down");
		eventSource.addEventListener("ping", () => {
			lastSeen.current = Date.now();
		});
		eventSource.onmessage = (event) => {
			lastSeen.current = Date.now();
			try {
				handleMessage(JSON.parse(event.data) as T);
			} catch {
				// ignore malformed messages
			}
		};
		source.current = eventSource;
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: a new url must reopen the stream
	useEffect(() => {
		if (!online) {
			source.current?.close();
			setStatus("down");
			return;
		}
		connect();

		const watchdog = setInterval(() => {
			if (Date.now() - lastSeen.current > STALE_AFTER_MS) connect();
		}, WATCHDOG_INTERVAL_MS);
		const onVisible = () => {
			if (
				document.visibilityState === "visible" &&
				source.current?.readyState === EventSource.CLOSED
			) {
				connect();
			}
		};
		document.addEventListener("visibilitychange", onVisible);

		return () => {
			clearInterval(watchdog);
			document.removeEventListener("visibilitychange", onVisible);
			source.current?.close();
			source.current = null;
		};
	}, [url, online]);

	return status;
}

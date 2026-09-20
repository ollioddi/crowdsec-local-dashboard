import moment from "moment";
import { useCallback, useRef, useSyncExternalStore } from "react";

/** One ticker for every relative time on the page, stopped when the last unmounts */
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | undefined;
let tickVersion = 0;

function subscribe(listener: () => void) {
	listeners.add(listener);
	ticker ??= setInterval(() => {
		tickVersion++;
		for (const notify of listeners) {
			notify();
		}
	}, 1_000);

	return () => {
		listeners.delete(listener);
		if (listeners.size === 0 && ticker !== undefined) {
			clearInterval(ticker);
			ticker = undefined;
		}
	};
}

const getServerSnapshot = () => "";

type Snapshot = { version: number; time: number | null; value: string };

/** "a few seconds ago" hides whether a live stream is still ticking. */
function format(time: number, precise: boolean): string {
	if (precise) {
		const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
		if (seconds < 60) return `${seconds}s ago`;
	}
	return moment(time).fromNow();
}

/**
 * A live "2 minutes ago" string. The snapshot must be cached per tick:
 * useSyncExternalStore re-reads it after commit, and recomputing from the clock
 * each call loops forever.
 */
export function useRelativeTime(
	date: string | Date | null | undefined,
	options?: { precise?: boolean },
): string {
	const precise = options?.precise ?? false;
	const time = date ? new Date(date).getTime() : null;
	const cache = useRef<Snapshot>({ version: -1, time: null, value: "" });

	const getSnapshot = useCallback(() => {
		if (cache.current.version !== tickVersion || cache.current.time !== time) {
			cache.current = {
				version: tickVersion,
				time,
				value: time === null ? "" : format(time, precise),
			};
		}
		return cache.current.value;
	}, [time, precise]);

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

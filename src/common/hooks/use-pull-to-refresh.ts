import { type RefObject, useEffect, useRef, useState } from "react";
import { haptic } from "@/common/lib/haptics";

const THRESHOLD_PX = 72;
const RESISTANCE = 0.5;
const MAX_PULL_PX = 110;

type PullState = {
	/** Current pull distance in pixels, already damped. */
	distance: number;
	/** 0–1 progress toward the release threshold. */
	progress: number;
	refreshing: boolean;
};

/**
 * Pull-to-refresh for a scrolling element. The document has overscroll
 * disabled, which also removes the browser's own gesture. Touch only.
 */
export function usePullToRefresh(
	scrollRef: RefObject<HTMLElement | null>,
	onRefresh: (() => Promise<unknown> | undefined) | undefined,
): PullState {
	const [distance, setDistance] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const startY = useRef<number | null>(null);
	const armed = useRef(false);
	// Read inside the handler, so a refresh does not re-bind mid-gesture
	const refreshingRef = useRef(false);

	useEffect(() => {
		const element = scrollRef.current;
		if (!element || !onRefresh) return;
		if (!globalThis.matchMedia?.("(pointer: coarse)").matches) return;

		const onTouchStart = (event: TouchEvent) => {
			if (element.scrollTop > 0 || refreshingRef.current) return;
			startY.current = event.touches[0].clientY;
			armed.current = false;
		};

		const onTouchMove = (event: TouchEvent) => {
			if (startY.current === null) return;
			const delta = event.touches[0].clientY - startY.current;
			if (delta <= 0 || element.scrollTop > 0) {
				startY.current = null;
				setDistance(0);
				return;
			}
			// The browser would otherwise scroll the container under the finger
			event.preventDefault();
			const damped = Math.min(delta * RESISTANCE, MAX_PULL_PX);
			setDistance(damped);
			if (!armed.current && damped >= THRESHOLD_PX) {
				armed.current = true;
				haptic();
			}
		};

		const onTouchEnd = async () => {
			if (startY.current === null) return;
			const shouldRefresh = armed.current;
			startY.current = null;
			armed.current = false;
			if (!shouldRefresh) {
				setDistance(0);
				return;
			}
			setDistance(THRESHOLD_PX);
			refreshingRef.current = true;
			setRefreshing(true);
			try {
				await onRefresh();
			} finally {
				refreshingRef.current = false;
				setRefreshing(false);
				setDistance(0);
			}
		};

		element.addEventListener("touchstart", onTouchStart, { passive: true });
		element.addEventListener("touchmove", onTouchMove, { passive: false });
		element.addEventListener("touchend", onTouchEnd);
		element.addEventListener("touchcancel", onTouchEnd);
		return () => {
			element.removeEventListener("touchstart", onTouchStart);
			element.removeEventListener("touchmove", onTouchMove);
			element.removeEventListener("touchend", onTouchEnd);
			element.removeEventListener("touchcancel", onTouchEnd);
		};
	}, [scrollRef, onRefresh]);

	return {
		distance,
		progress: Math.min(distance / THRESHOLD_PX, 1),
		refreshing,
	};
}

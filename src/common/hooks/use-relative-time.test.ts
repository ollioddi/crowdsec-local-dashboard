// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRelativeTime } from "./use-relative-time";

const NOW = new Date("2026-09-20T12:00:00Z");
const secondsAgo = (seconds: number) =>
	new Date(NOW.getTime() - seconds * 1000).toISOString();

beforeEach(() => vi.useFakeTimers({ now: NOW }));
afterEach(() => vi.useRealTimers());

describe("useRelativeTime", () => {
	it("moves the text on as the clock runs", () => {
		const { result, unmount } = renderHook(() =>
			useRelativeTime(secondsAgo(30)),
		);
		expect(result.current).toBe("a few seconds ago");

		act(() => vi.advanceTimersByTime(30_000));
		expect(result.current).toBe("a minute ago");

		unmount();
	});

	it("keeps ticking when the date object is replaced by an equal one", () => {
		const iso = secondsAgo(30);
		const { result, rerender, unmount } = renderHook(
			({ date }) => useRelativeTime(date),
			{ initialProps: { date: new Date(iso) } },
		);

		// A live update hands every row a fresh Date; the old per-instance timer
		// restarted here and never fired.
		rerender({ date: new Date(iso) });
		act(() => vi.advanceTimersByTime(30_000));
		expect(result.current).toBe("a minute ago");

		unmount();
	});

	it("runs one ticker for all subscribers and stops with the last", () => {
		const first = renderHook(() => useRelativeTime(secondsAgo(60)));
		const second = renderHook(() => useRelativeTime(secondsAgo(120)));
		expect(vi.getTimerCount()).toBe(1);

		first.unmount();
		expect(vi.getTimerCount()).toBe(1);

		second.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("has no text without a date", () => {
		const { result, unmount } = renderHook(() => useRelativeTime(null));
		expect(result.current).toBe("");
		unmount();
	});
});

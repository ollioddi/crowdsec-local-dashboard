// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSignInCooldown } from "./use-sign-in-cooldown";

beforeEach(() => {
	vi.useFakeTimers();
	sessionStorage.clear();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

it("counts down each second and clears itself at zero", () => {
	const { result } = renderHook(() => useSignInCooldown());
	act(() => result.current.start(Date.now() + 3_000));
	expect(result.current.secondsLeft).toBe(3);

	act(() => vi.advanceTimersByTime(1_000));
	expect(result.current.secondsLeft).toBe(2);

	act(() => vi.advanceTimersByTime(2_000));
	expect(result.current.secondsLeft).toBe(0);
	expect(sessionStorage.length).toBe(0);
});

it("picks up a running cooldown after a reload", () => {
	const first = renderHook(() => useSignInCooldown());
	act(() => first.result.current.start(Date.now() + 30_000));
	first.unmount();

	// Remounting simulates a reload
	const { result } = renderHook(() => useSignInCooldown());
	expect(result.current.secondsLeft).toBe(30);
});

it("ignores a cooldown that ended while the page was closed", () => {
	sessionStorage.setItem("sign-in-retry-at", String(Date.now() - 1_000));
	const { result } = renderHook(() => useSignInCooldown());
	expect(result.current.secondsLeft).toBe(0);
});

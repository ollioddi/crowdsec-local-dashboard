// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSSEConnection } from "./use-sse-connection";

class FakeEventSource extends EventTarget {
	static CLOSED = 2;
	static instances: FakeEventSource[] = [];
	readyState = 0;
	onopen: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	constructor(public url: string) {
		super();
		FakeEventSource.instances.push(this);
	}
	close() {
		this.readyState = FakeEventSource.CLOSED;
	}
	open() {
		this.readyState = 1;
		this.onopen?.();
	}
}

beforeEach(() => {
	vi.useFakeTimers();
	FakeEventSource.instances = [];
	vi.stubGlobal("EventSource", FakeEventSource);
	vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it("marks a silent connection down and reconnects until it opens", () => {
	const { result } = renderHook(() => useSSEConnection("/sse/test", () => {}));
	const first = FakeEventSource.instances[0];
	act(() => first.open());
	expect(result.current).toBe("live");
	act(() => vi.advanceTimersByTime(50_000));
	expect(first.readyState).toBe(FakeEventSource.CLOSED);
	expect(result.current).toBe("down");
	expect(FakeEventSource.instances).toHaveLength(2);
	act(() => FakeEventSource.instances[1].open());
	expect(result.current).toBe("live");
});

it("keeps a healthy idle stream open on named pings", () => {
	renderHook(() => useSSEConnection("/sse/test", () => {}));
	const first = FakeEventSource.instances[0];
	act(() => first.open());
	for (let i = 0; i < 4; i++) {
		act(() => {
			vi.advanceTimersByTime(20_000);
			first.dispatchEvent(new Event("ping"));
		});
	}
	expect(FakeEventSource.instances).toHaveLength(1);
});

it("closes offline and reconnects when the network returns", () => {
	const { result } = renderHook(() => useSSEConnection("/sse/test", () => {}));
	act(() => {
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
		window.dispatchEvent(new Event("offline"));
	});
	expect(result.current).toBe("down");
	expect(FakeEventSource.instances[0].readyState).toBe(FakeEventSource.CLOSED);
	act(() => {
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
		window.dispatchEvent(new Event("online"));
	});
	expect(FakeEventSource.instances).toHaveLength(2);
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/common/lib/logging/logger", () => ({
	logger: () => ({ debug: vi.fn() }),
}));

type SSE = typeof import("./sse.server");
let sse: SSE;

function fakeController(desiredSize = 16) {
	return {
		desiredSize,
		enqueue: vi.fn(),
		close: vi.fn(),
		error: vi.fn(),
	} as unknown as ReadableStreamDefaultController & {
		enqueue: ReturnType<typeof vi.fn>;
		close: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};
}

function connect(
	id: string,
	userId: string,
	options: { channel?: string; cookie?: string; desiredSize?: number } = {},
) {
	const controller = fakeController(options.desiredSize);
	sse.registerSSEConnection(id, options.channel ?? "decisions", {
		controller,
		userId,
		cookie: options.cookie ?? `session=${userId}`,
	});
	controller.enqueue.mockClear();
	return controller;
}

beforeEach(async () => {
	vi.resetModules();
	sse = await import("./sse.server");
});

afterEach(() => sse.closeAllSSEConnections());

it("caps streams per user across channels", () => {
	for (let i = 0; i < 30; i++) {
		connect(`a${i}`, "alice", { channel: i % 2 ? "hosts" : "decisions" });
	}
	expect(sse.hasCapacity("alice")).toBe(false);
	expect(sse.hasCapacity("bob")).toBe(true);

	sse.unregisterSSEConnection("a0", "decisions");
	expect(sse.hasCapacity("alice")).toBe(true);
});

it("caps streams for everyone together", () => {
	for (let i = 0; i < 300; i++) connect(`c${i}`, `user${i}`);
	expect(sse.hasCapacity("newcomer")).toBe(false);
});

it("drops a stream that stopped reading instead of queueing more", () => {
	const reader = connect("reader", "alice");
	const stuck = connect("stuck", "bob", { desiredSize: 0 });

	sse.broadcastEvent("decisions", { n: 1 });
	expect(reader.enqueue).toHaveBeenCalledTimes(1);
	expect(stuck.enqueue).not.toHaveBeenCalled();
	expect(stuck.error).toHaveBeenCalledTimes(1);

	sse.broadcastEvent("decisions", { n: 2 });
	expect(reader.enqueue).toHaveBeenCalledTimes(2);
	expect(stuck.error).toHaveBeenCalledTimes(1);
});

it("closes only the streams whose session ended, checking each cookie once", async () => {
	const aliceDecisions = connect("a1", "alice");
	const aliceHosts = connect("a2", "alice", { channel: "hosts" });
	const bob = connect("b1", "bob");
	const isValid = vi.fn(async (cookie: string) => cookie !== "session=alice");

	await sse.revalidateSessions(isValid);

	expect(isValid).toHaveBeenCalledTimes(2);
	expect(aliceDecisions.close).toHaveBeenCalled();
	expect(aliceHosts.close).toHaveBeenCalled();
	expect(bob.close).not.toHaveBeenCalled();

	sse.broadcastEvent("decisions", {});
	expect(bob.enqueue).toHaveBeenCalledTimes(1);
	expect(aliceDecisions.enqueue).not.toHaveBeenCalled();
	expect(sse.hasCapacity("alice")).toBe(true);
});

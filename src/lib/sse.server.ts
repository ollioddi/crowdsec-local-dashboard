/**
 * SSE channel management: channels → connections (ReadableStream controllers).
 */

const HEARTBEAT_MS = 20_000;

const channels = new Map<
	string,
	Map<string, ReadableStreamDefaultController>
>();

const encoder = new TextEncoder();
const heartbeat = encoder.encode(": ping\n\n");

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function send(
	conns: Map<string, ReadableStreamDefaultController>,
	chunk: Uint8Array,
) {
	for (const [id, controller] of conns) {
		try {
			controller.enqueue(chunk);
		} catch {
			conns.delete(id);
		}
	}
}

/** Keeps idle connections alive through proxies with read timeouts. */
function ensureHeartbeat() {
	if (heartbeatTimer) return;
	heartbeatTimer = setInterval(() => {
		for (const conns of channels.values()) send(conns, heartbeat);
	}, HEARTBEAT_MS);
	heartbeatTimer.unref?.();
}

export function registerSSEConnection(
	id: string,
	controller: ReadableStreamDefaultController,
	channel: string,
) {
	if (!channels.has(channel)) {
		channels.set(channel, new Map());
	}
	channels.get(channel)?.set(id, controller);
	controller.enqueue(encoder.encode(": connected\n\n"));
	ensureHeartbeat();
}

export function unregisterSSEConnection(id: string, channel: string) {
	const conns = channels.get(channel);
	if (!conns) return;
	conns.delete(id);
	if (conns.size === 0) {
		channels.delete(channel);
	}
}

/** Ends every open stream so the HTTP server can drain on shutdown. */
export function closeAllSSEConnections() {
	for (const conns of channels.values()) {
		for (const controller of conns.values()) {
			try {
				controller.close();
			} catch {
				// already closed by the client
			}
		}
	}
	channels.clear();
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}
}

export function broadcastEvent(channel: string, payload: unknown) {
	const conns = channels.get(channel);
	if (!conns) return;
	send(conns, encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

/** Builds the GET handler for an SSE route. Unauthenticated requests get 401. */
export function createSSEHandler(channel: string) {
	return async ({ request }: { request: Request }) => {
		const { getSessionFn } = await import("@/lib/auth/auth.functions");
		const session = await getSessionFn();
		if (!session) {
			// A redirect would make EventSource follow it to the login page and retry forever
			return new Response("Unauthorized", { status: 401 });
		}

		const connectionId = crypto.randomUUID();
		const stream = new ReadableStream({
			start(controller) {
				registerSSEConnection(connectionId, controller, channel);
			},
			cancel() {
				unregisterSSEConnection(connectionId, channel);
			},
		});
		request.signal.addEventListener("abort", () => {
			unregisterSSEConnection(connectionId, channel);
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no",
			},
		});
	};
}

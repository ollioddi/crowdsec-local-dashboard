/**
 * SSE channel management: channels → connections (ReadableStream controllers).
 */

import { logger } from "@/common/lib/logging/logger";

const HEARTBEAT_MS = 20_000;
const SESSION_CHECK_MS = 60_000;
// Each tab opens two streams
const MAX_CONNECTIONS_PER_USER = 30;
const MAX_CONNECTIONS = 300;
// Unread messages before a stream is dropped
const MAX_QUEUED_CHUNKS = 16;

const log = logger("sse");

interface Connection {
	controller: ReadableStreamDefaultController;
	userId: string;
	cookie: string;
}

const channels = new Map<string, Map<string, Connection>>();

const encoder = new TextEncoder();
// Named, not a comment: the client listens for it to detect a dead stream
const heartbeat = encoder.encode("event: ping\ndata: {}\n\n");

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let sessionTimer: ReturnType<typeof setInterval> | null = null;

function close(connection: Connection) {
	try {
		connection.controller.close();
	} catch {
		// already closed by the client
	}
}

function send(conns: Map<string, Connection>, chunk: Uint8Array) {
	for (const [id, connection] of conns) {
		const { controller } = connection;
		// Drop clients that stopped reading
		if (controller.desiredSize !== null && controller.desiredSize <= 0) {
			log.debug("Dropping a stream that stopped reading");
			try {
				controller.error(new Error("Client stopped reading"));
			} catch {
				// already closed
			}
			conns.delete(id);
			continue;
		}
		try {
			controller.enqueue(chunk);
		} catch {
			conns.delete(id);
		}
	}
}

async function sessionIsValid(cookie: string): Promise<boolean> {
	try {
		const { auth } = await import("@/common/auth/auth.server");
		const session = await auth.api.getSession({
			headers: new Headers({ cookie }),
			// Don't extend the session
			query: { disableRefresh: true },
		});
		return session !== null;
	} catch {
		// On a database error, keep streams open
		return true;
	}
}

/** Keeps idle connections alive through proxies with read timeouts. */
function ensureTimers() {
	if (!heartbeatTimer) {
		heartbeatTimer = setInterval(() => {
			for (const conns of channels.values()) send(conns, heartbeat);
		}, HEARTBEAT_MS);
		heartbeatTimer.unref?.();
	}
	if (!sessionTimer) {
		sessionTimer = setInterval(() => {
			void revalidateSessions(sessionIsValid);
		}, SESSION_CHECK_MS);
		sessionTimer.unref?.();
	}
}

function countConnections(userId?: string): number {
	let count = 0;
	for (const conns of channels.values()) {
		for (const connection of conns.values()) {
			if (userId === undefined || connection.userId === userId) count++;
		}
	}
	return count;
}

/** Whether another stream fits under the per-user and global caps. */
export function hasCapacity(userId: string): boolean {
	return (
		countConnections() < MAX_CONNECTIONS &&
		countConnections(userId) < MAX_CONNECTIONS_PER_USER
	);
}

export function registerSSEConnection(
	id: string,
	channel: string,
	connection: Connection,
) {
	if (!channels.has(channel)) {
		channels.set(channel, new Map());
	}
	channels.get(channel)?.set(id, connection);
	connection.controller.enqueue(encoder.encode(": connected\n\n"));
	ensureTimers();
}

export function unregisterSSEConnection(id: string, channel: string) {
	const conns = channels.get(channel);
	if (!conns) return;
	conns.delete(id);
	if (conns.size === 0) {
		channels.delete(channel);
	}
}

/** Closes streams whose session ended (logout, expiry, deleted user). */
export async function revalidateSessions(
	isValid: (cookie: string) => Promise<boolean>,
) {
	const cookies = new Set<string>();
	for (const conns of channels.values()) {
		for (const connection of conns.values()) cookies.add(connection.cookie);
	}
	const expired = new Set<string>();
	for (const cookie of cookies) {
		if (!(await isValid(cookie))) expired.add(cookie);
	}
	if (expired.size === 0) return;

	for (const [channel, conns] of channels) {
		for (const [id, connection] of conns) {
			if (!expired.has(connection.cookie)) continue;
			close(connection);
			unregisterSSEConnection(id, channel);
		}
	}
	log.debug("Closed streams for {count} ended sessions", {
		count: expired.size,
	});
}

/** Ends every open stream so the HTTP server can drain on shutdown. */
export function closeAllSSEConnections() {
	for (const conns of channels.values()) {
		for (const connection of conns.values()) close(connection);
	}
	channels.clear();
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}
	if (sessionTimer) {
		clearInterval(sessionTimer);
		sessionTimer = null;
	}
}

export function broadcastEvent(channel: string, payload: unknown) {
	const conns = channels.get(channel);
	if (!conns) return;
	send(conns, encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

/** GET handler for an SSE route: 401 without a session, 429 over the caps. */
export function createSSEHandler(channel: string) {
	return async ({ request }: { request: Request }) => {
		const { getSessionFn } = await import("@/common/auth/auth.functions");
		const session = await getSessionFn();
		if (!session) {
			// A redirect would make EventSource follow it to the login page and retry forever
			return new Response("Unauthorized", { status: 401 });
		}
		const userId = session.user.id;
		if (!hasCapacity(userId)) {
			return new Response("Too many live connections", { status: 429 });
		}

		const connectionId = crypto.randomUUID();
		const cookie = request.headers.get("cookie") ?? "";
		const stream = new ReadableStream(
			{
				start(controller) {
					registerSSEConnection(connectionId, channel, {
						controller,
						userId,
						cookie,
					});
				},
				cancel() {
					unregisterSSEConnection(connectionId, channel);
				},
			},
			new CountQueuingStrategy({ highWaterMark: MAX_QUEUED_CHUNKS }),
		);
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

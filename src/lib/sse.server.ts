/**
 * SSE channel management for server-sent events.
 * Maintains a map of channels → connections (ReadableStream controllers).
 */

const channels = new Map<
	string,
	Map<string, ReadableStreamDefaultController>
>();

const encoder = new TextEncoder();

export function registerSSEConnection(
	id: string,
	controller: ReadableStreamDefaultController,
	channel: string,
) {
	if (!channels.has(channel)) {
		channels.set(channel, new Map());
	}
	channels.get(channel)?.set(id, controller);

	// Send a comment to keep the connection alive in case the client is behind a proxy that buffers small responses
	controller.enqueue(encoder.encode(": connected\n\n"));
}

export function unregisterSSEConnection(id: string, channel: string) {
	const conns = channels.get(channel);
	if (!conns) return;
	conns.delete(id);
	if (conns.size === 0) {
		channels.delete(channel);
	}
}

export function broadcastEvent(channel: string, payload: unknown) {
	const conns = channels.get(channel);
	if (!conns) return;
	const data = JSON.stringify(payload);
	const encoded = encoder.encode(`data: ${data}\n\n`);
	for (const [id, controller] of conns) {
		try {
			controller.enqueue(encoded);
		} catch {
			conns.delete(id);
		}
	}
}

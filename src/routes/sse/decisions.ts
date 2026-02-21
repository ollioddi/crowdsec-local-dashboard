import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionFn } from "@/lib/auth/auth.functions";
import {
	registerSSEConnection,
	unregisterSSEConnection,
} from "@/lib/sse.server";

const CHANNEL = "decisions";

export const Route = createFileRoute("/sse/decisions")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getSessionFn();

				if (!session) {
					throw redirect({ to: "/login" });
				}

				const connectionId = crypto.randomUUID();

				const stream = new ReadableStream({
					start(controller) {
						registerSSEConnection(connectionId, controller, CHANNEL);
					},
					cancel() {
						unregisterSSEConnection(connectionId, CHANNEL);
					},
				});

				request.signal.addEventListener("abort", () => {
					unregisterSSEConnection(connectionId, CHANNEL);
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
						"X-Accel-Buffering": "no",
					},
				});
			},
		},
	},
});

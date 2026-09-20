import { createFileRoute } from "@tanstack/react-router";
import { createSSEHandler } from "@/common/lib/sse.server";

export const Route = createFileRoute("/sse/sync-status")({
	server: {
		handlers: {
			GET: createSSEHandler("sync-status"),
		},
	},
});

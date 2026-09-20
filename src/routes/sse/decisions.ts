import { createFileRoute } from "@tanstack/react-router";
import { createSSEHandler } from "@/common/lib/sse.server";

export const Route = createFileRoute("/sse/decisions")({
	server: {
		handlers: {
			GET: createSSEHandler("decisions"),
		},
	},
});

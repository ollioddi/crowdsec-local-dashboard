import { createFileRoute } from "@tanstack/react-router";
import { createSSEHandler } from "@/common/lib/sse.server";

export const Route = createFileRoute("/sse/hosts")({
	server: {
		handlers: {
			GET: createSSEHandler("hosts"),
		},
	},
});

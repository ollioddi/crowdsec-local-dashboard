import { createFileRoute } from "@tanstack/react-router";
import { getHealthResponse } from "@/common/lib/health.server";

export const Route = createFileRoute("/healthz")({
	server: {
		handlers: {
			GET: getHealthResponse,
		},
	},
});

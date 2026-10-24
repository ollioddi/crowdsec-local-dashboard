import { createFileRoute } from "@tanstack/react-router";
import { getReadinessResponse } from "@/common/lib/health.server";

export const Route = createFileRoute("/readyz")({
	server: {
		handlers: {
			GET: getReadinessResponse,
		},
	},
});

import { createFileRoute } from "@tanstack/react-router";

// Liveness only; never touches the database
export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: () => Response.json({ status: "ok" }),
		},
	},
});

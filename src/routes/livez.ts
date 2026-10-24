import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/livez")({
	server: {
		handlers: {
			GET: () => Response.json({ status: "ok" }),
		},
	},
});

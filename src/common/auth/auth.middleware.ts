import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

/** Rejects server-function calls without a valid session (401). */
export const authMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const { auth } = await import("@/common/auth/auth.server");
		const session = await auth.api.getSession({
			headers: getRequestHeaders(),
		});
		if (!session) {
			throw new Response("Unauthorized", { status: 401 });
		}
		return next({ context: { session } });
	},
);

import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/auth.middleware";

export const getHostsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const { prisma } = await import("@/db");
		return prisma.host.findMany({
			orderBy: { lastSeen: "desc" },
			include: {
				_count: {
					select: { decisions: { where: { active: true } } },
				},
			},
		});
	});

export type HostWithCount = Awaited<ReturnType<typeof getHostsFn>>[number];

import { createServerFn } from "@tanstack/react-start";

export const getHostsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { prisma } = await import("@/db");
		return prisma.host.findMany({
			orderBy: { lastSeen: "desc" },
			include: {
				_count: {
					select: { decisions: { where: { active: true } } },
				},
			},
		});
	},
);

export type HostWithCount = Awaited<ReturnType<typeof getHostsFn>>[number];

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/common/auth/auth.middleware";

export const getHostsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const { prisma } = await import("@/common/lib/db");
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

/** Aggregate retained evidence only when a host expansion is opened. */
export const getHostActivityFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ hostIp: z.string().min(1).max(255) }))
	.handler(async ({ data }) => {
		const { prisma } = await import("@/common/lib/db");
		const { alertDetailFromRow } = await import(
			"@/features/decisions/api/alert-detail"
		);
		const { buildHostActivity } = await import("./host-activity");
		const [decisions, alerts] = await prisma.$transaction([
			prisma.decision.findMany({
				where: { hostIp: data.hostIp },
				select: {
					id: true,
					scenario: true,
					active: true,
					simulated: true,
					origin: true,
					createdAt: true,
				},
			}),
			prisma.alert.findMany({ where: { hostIp: data.hostIp } }),
		]);
		return buildHostActivity(decisions, alerts.map(alertDetailFromRow));
	});

import { prisma } from "@/common/lib/db";
import { logger } from "@/common/lib/logging/logger";
import { broadcastEvent } from "@/common/lib/sse.server";

const log = logger("broadcast");

/** Push the current active decisions and all hosts to every SSE subscriber. */
export async function broadcastCurrentState(): Promise<void> {
	const activeDecisionsRaw = await prisma.decision.findMany({
		where: { active: true },
		include: {
			host: true,
			alerts: {
				select: { id: true, entries: true, entryType: true, scenario: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});
	const activeDecisions = activeDecisionsRaw.map((d) => ({
		...d,
		alerts: d.alerts.map((a) => ({
			id: a.id,
			scenario: a.scenario,
			entries: JSON.parse(a.entries) as string[],
			entryType: a.entryType,
		})),
	}));
	broadcastEvent("decisions", activeDecisions);

	const allHosts = await prisma.host.findMany({
		orderBy: { lastSeen: "desc" },
		include: {
			_count: {
				select: { decisions: { where: { active: true } } },
			},
		},
	});
	broadcastEvent("hosts", allHosts);

	log.debug("Broadcast {decisions} active decisions and {hosts} hosts", {
		decisions: activeDecisions.length,
		hosts: allHosts.length,
	});
}

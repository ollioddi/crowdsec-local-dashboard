import { prisma } from "@/common/lib/db";
import { logger } from "@/common/lib/logging/logger";
import { broadcastEvent } from "@/common/lib/sse.server";
import { queryActiveDecisionsPayload } from "@/features/decisions/api/decisions-query.server";

const log = logger("broadcast");

/** Push the current active decisions and all hosts to every SSE subscriber. */
export async function broadcastCurrentState(): Promise<void> {
	const decisions = await queryActiveDecisionsPayload();
	broadcastEvent("decisions", decisions);

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
		decisions: decisions.decisions.length,
		hosts: allHosts.length,
	});
}

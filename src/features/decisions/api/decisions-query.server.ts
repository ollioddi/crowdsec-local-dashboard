import { prisma } from "@/common/lib/db";
import type {
	DecisionHost,
	DecisionsPayload,
} from "@/features/decisions/api/decisions.types";

/** Only the host columns the decisions view renders. */
const HOST_SELECT = {
	ip: true,
	scope: true,
	country: true,
	asName: true,
	asNumber: true,
} as const;

const DECISION_SELECT = {
	id: true,
	hostIp: true,
	type: true,
	origin: true,
	scenario: true,
	duration: true,
	createdAt: true,
	expiresAt: true,
	active: true,
	scope: true,
	simulated: true,
	alerts: { select: { entries: true } },
} as const;

/** One query for both callers, so the selected shape cannot drift. */
function findRows(where?: { active: boolean }) {
	return prisma.decision.findMany({
		...(where && { where }),
		select: DECISION_SELECT,
		orderBy: { createdAt: "desc" },
	});
}

type RawRow = Awaited<ReturnType<typeof findRows>>[number];

/** Counted here so the payload carries a number, not every path string. */
function countEntries(alerts: Array<{ entries: string }>): number {
	const seen = new Set<string>();
	for (const alert of alerts) {
		try {
			for (const entry of JSON.parse(alert.entries) as string[]) {
				seen.add(entry);
			}
		} catch {
			// A malformed entries blob just contributes nothing
		}
	}
	return seen.size;
}

function toPayload(rows: RawRow[], hosts: DecisionHost[]): DecisionsPayload {
	return {
		decisions: rows.map(({ alerts, scope, simulated, ...decision }) => {
			// Defaults omitted: at 50k rows the repeated keys outweigh the value.
			const row = {
				...decision,
				...(simulated && { simulated }),
				...(scope !== "Ip" && { scope }),
			};
			if (alerts.length === 0) return row;
			const entryCount = countEntries(alerts);
			return {
				...row,
				alertCount: alerts.length,
				...(entryCount > 0 && { entryCount }),
			};
		}),
		hosts: Object.fromEntries(hosts.map((host) => [host.ip, host])),
	};
}

/** Every decision, with hosts deduplicated into a lookup. */
export async function queryDecisionsPayload(): Promise<DecisionsPayload> {
	const [rows, hosts] = await Promise.all([
		findRows(),
		prisma.host.findMany({ select: HOST_SELECT }),
	]);
	return toPayload(rows, hosts);
}

/** Active decisions for the SSE broadcast, with only the hosts they use. */
export async function queryActiveDecisionsPayload(): Promise<DecisionsPayload> {
	const rows = await findRows({ active: true });
	const hosts = await prisma.host.findMany({
		where: { ip: { in: [...new Set(rows.map((row) => row.hostIp))] } },
		select: HOST_SELECT,
	});
	return toPayload(rows, hosts);
}

import type { LapiClient } from "@/common/crowdsec-lapi/lapi-client";
import type {
	CrowdSecAlert,
	CrowdSecDecision,
} from "@/common/crowdsec-lapi/types";
import { errorFields, logger } from "@/common/lib/logging/logger";

const log = logger("lapi-sync");

const ALERT_FETCH_CHUNK_SIZE = 10;

function indexAlert(
	alert: CrowdSecAlert,
	wantedIds: Set<number>,
	out: Map<number, CrowdSecAlert[]>,
): void {
	// Skip bulk CAPI/blocklist alerts that carry no event log lines
	if (!alert.events?.length) return;

	for (const decision of alert.decisions ?? []) {
		if (!wantedIds.has(decision.id)) continue;
		const existing = out.get(decision.id) ?? [];
		existing.push(alert);
		out.set(decision.id, existing);
	}
}

/**
 * Fetches parent Alerts from LAPI for the given decisions and returns
 * a map of DecisionID → Alert[].
 *
 * Only locally-generated alerts (origin=crowdsec) are fetched.
 * CAPI / blocklist bulk alerts (which have no events) are skipped.
 *
 * Strategy: query alerts by IP in chunks, then invert Alert.decisions[]
 * into a lookup map keyed by decision ID.
 */
export async function buildDecisionToAlertMap(
	decisions: CrowdSecDecision[],
	client: LapiClient,
): Promise<Map<number, CrowdSecAlert[]>> {
	const out = new Map<number, CrowdSecAlert[]>();
	const wantedIds = new Set(decisions.map((d) => d.id));
	const distinctIps = [...new Set(decisions.map((d) => d.value))];

	for (let i = 0; i < distinctIps.length; i += ALERT_FETCH_CHUNK_SIZE) {
		const chunk = distinctIps.slice(i, i + ALERT_FETCH_CHUNK_SIZE);

		const alertsPerIp = await Promise.all(
			chunk.map((ip) =>
				client
					.getAlerts({ ip, has_active_decision: true, origin: "crowdsec" })
					.catch((e) => {
						log.warn("Could not fetch alerts for {ip}: {errorMessage}", {
							ip,
							...errorFields(e),
						});
						return [] as CrowdSecAlert[];
					}),
			),
		);

		for (const alerts of alertsPerIp) {
			for (const alert of alerts) {
				indexAlert(alert, wantedIds, out);
			}
		}
	}

	log.debug("Linked {linked} of {decisions} decisions to alerts", {
		linked: out.size,
		decisions: decisions.length,
	});

	return out;
}

import type { LapiClient } from "@/lib/crowdsec-lapi/lapi-client";
import type {
	CrowdSecAlert,
	CrowdSecDecision,
} from "@/lib/crowdsec-lapi/types";

const ALERT_FETCH_CHUNK_SIZE = 10;

/**
 * Fetches parent Alerts from LAPI for the given decisions and returns
 * a map of DecisionID → Alert[].
 *
 * A single decision can have multiple alerts (multiple scenarios can each
 * produce an alert referencing the same decision). We accumulate all of them.
 *
 * Strategy: query alerts by IP in chunks, then invert Alert.decisions[]
 * into a lookup map keyed by decision ID.
 */
export async function buildDecisionToAlertMap(
	decisions: CrowdSecDecision[],
	client: LapiClient,
): Promise<Map<number, CrowdSecAlert[]>> {
	const decisionIdToAlerts = new Map<number, CrowdSecAlert[]>();
	const wantedIds = new Set(decisions.map((d) => d.id));
	const distinctIps = [...new Set(decisions.map((d) => d.value))];

	for (let i = 0; i < distinctIps.length; i += ALERT_FETCH_CHUNK_SIZE) {
		const chunk = distinctIps.slice(i, i + ALERT_FETCH_CHUNK_SIZE);

		// Fan out within the chunk — the API doesn't support multi-IP queries
		const alertsPerIp = await Promise.all(
			chunk.map((ip) =>
				client.getAlerts({ ip, has_active_decision: true }).catch((e) => {
					console.warn(`[lapi-sync] Failed to fetch alerts for ${ip}:`, e);
					return [] as CrowdSecAlert[];
				}),
			),
		);

		for (const alerts of alertsPerIp) {
			for (const alert of alerts) {
				for (const decision of alert.decisions ?? []) {
					if (wantedIds.has(decision.id)) {
						const existing = decisionIdToAlerts.get(decision.id) ?? [];
						existing.push(alert);
						decisionIdToAlerts.set(decision.id, existing);
					}
				}
			}
		}
	}

	console.log(
		`[lapi-sync] Linked ${decisionIdToAlerts.size}/${decisions.length} decisions to alerts`,
	);

	return decisionIdToAlerts;
}

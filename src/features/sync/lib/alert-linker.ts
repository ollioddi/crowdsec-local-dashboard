import type { LapiClient } from "@/common/crowdsec-lapi/lapi-client";
import type {
	CrowdSecAlert,
	CrowdSecDecision,
} from "@/common/crowdsec-lapi/types";
import { env } from "@/common/lib/env";
import { errorFields, logger } from "@/common/lib/logging/logger";
import { describeError, recordAlertFetch } from "./status";

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
 * Every origin is fetched: CAPI / blocklist bulk alerts carry no events and
 * are skipped by `indexAlert`, while a console or cscli alert that does have
 * events keeps them.
 *
 * Strategy: query alerts by IP in chunks, then invert Alert.decisions[]
 * into a lookup map keyed by decision ID.
 *
 * Failures are not fatal but are reported to sync status: a missing watcher
 * credential otherwise looks identical to "no evidence exists".
 */
export async function buildDecisionToAlertMap(
	decisions: CrowdSecDecision[],
	client: LapiClient,
): Promise<Map<number, CrowdSecAlert[]>> {
	const out = new Map<number, CrowdSecAlert[]>();

	// syncDecisions records the unconfigured state, every poll
	if (!client.canFetchAlerts) return out;

	const wantedIds = new Set(decisions.map((d) => d.id));
	const distinctIps = [...new Set(decisions.map((d) => d.value))];
	let failures = 0;
	let firstError: string | null = null;

	for (let i = 0; i < distinctIps.length; i += ALERT_FETCH_CHUNK_SIZE) {
		const chunk = distinctIps.slice(i, i + ALERT_FETCH_CHUNK_SIZE);

		const alertsPerIp = await Promise.all(
			chunk.map((ip) =>
				client
					.getAlerts({
						ip,
						has_active_decision: true,
						limit: env.LAPI_ALERT_LIMIT,
					})
					.catch((e) => {
						failures++;
						firstError ??= describeError(e);
						log.debug("Could not fetch alerts for {ip}: {errorMessage}", {
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

	if (failures > 0) {
		// One line per sync: a bad credential fails every IP
		log.warn(
			"Alert fetch failed for {failures} of {total} hosts: {errorMessage}",
			{ failures, total: distinctIps.length, errorMessage: firstError },
		);
		recordAlertFetch({
			state: "failing",
			message: `Alert fetch failed for ${failures} of ${distinctIps.length} hosts: ${firstError}`,
		});
	} else {
		recordAlertFetch({ state: "ok", message: null });
	}

	log.debug("Linked {linked} of {decisions} decisions to alerts", {
		linked: out.size,
		decisions: decisions.length,
	});

	return out;
}

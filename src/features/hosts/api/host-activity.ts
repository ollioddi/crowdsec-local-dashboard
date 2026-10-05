import { integrationLabel } from "@/common/parsing/registry";
import type { AlertDetail } from "@/features/decisions/api/alert-detail";
import type { Decision } from "@/generated/prisma/client";

export type ActivityDecision = Pick<
	Decision,
	"id" | "scenario" | "active" | "simulated" | "origin" | "createdAt"
>;

/** Values are counted once per alert, not as estimated request/attempt counts. */
export function observedValues(alert: AlertDetail): Record<string, string[]> {
	const values: Record<string, string[]> = {};
	const add = (label: string, items: Array<string | undefined>) => {
		values[label] = [
			...new Set([
				...(values[label] ?? []),
				...items.filter((v): v is string => !!v),
			]),
		];
	};
	for (const event of alert.events) {
		add("Requested domains", [event.facets.target?.fqdn]);
		add("Requested paths", [event.facets.target?.uri]);
		const fields = event.fields;
		if (fields.kind === "traefik-http") add("Requested paths", [fields.path]);
		if (fields.kind === "ssh") add("Attempted SSH accounts", [fields.user]);
		if (fields.kind === "postfix")
			add("Mail rejections", [
				fields.reason ?? fields.category,
				fields.violation,
			]);
		if (fields.kind === "appsec")
			add(
				"AppSec rules",
				fields.ruleName ? [fields.ruleName] : (fields.ruleIds ?? []),
			);
	}
	const aggregates = alert.aggregates;
	switch (aggregates.kind) {
		case "traefik-http":
			add("Requested paths", aggregates.targetUris ?? []);
			break;
		case "appsec":
			add("Requested paths", aggregates.targetUris ?? []);
			add("AppSec rules", aggregates.ruleNames ?? aggregates.rules ?? []);
			break;
		case "ssh":
			add("Attempted SSH accounts", aggregates.usernames ?? []);
			break;
		case "dovecot":
			add("Attempted mail accounts", aggregates.mailboxes ?? []);
			add("Mail authentication reasons", aggregates.loginMessages ?? []);
			break;
		case "opnsense-pf":
			add("Destination ports", aggregates.dstPorts ?? []);
			break;
	}
	if (alert.entryType === "ports") add("Destination ports", alert.entries);
	return values;
}

export function buildHostActivity(
	decisions: ActivityDecision[],
	alerts: AlertDetail[],
) {
	const scenarios = new Map<
		string,
		{
			scenario: string;
			alertCount: number;
			decisionCount: number;
			activeCount: number;
			simulatedCount: number;
			latestAt: Date;
			services: Set<string>;
			agents: Set<string>;
			origins: Set<string>;
		}
	>();
	const scenarioRow = (name: string, date: Date) => {
		let row = scenarios.get(name);
		if (!row) {
			row = {
				scenario: name,
				alertCount: 0,
				decisionCount: 0,
				activeCount: 0,
				simulatedCount: 0,
				latestAt: date,
				services: new Set(),
				agents: new Set(),
				origins: new Set(),
			};
			scenarios.set(name, row);
		}
		if (date > row.latestAt) row.latestAt = date;
		return row;
	};
	for (const decision of decisions) {
		const row = scenarioRow(decision.scenario, decision.createdAt);
		row.decisionCount++;
		if (decision.active) {
			if (decision.simulated) row.simulatedCount++;
			else row.activeCount++;
		}
		row.origins.add(decision.origin);
	}
	const targets = new Map<string, Map<string, number>>();
	const ranges = new Set<string>();
	let country: string | undefined;
	let asName: string | undefined;
	let asNumber: string | undefined;
	// Newest enrichment wins. Alert IDs are unique: one alert linked to several
	// decisions still contributes only once to counts and observed values.
	const ordered = [...new Map(alerts.map((a) => [a.id, a])).values()].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
	);
	for (const alert of ordered) {
		const row = scenarioRow(alert.scenario, alert.createdAt);
		row.alertCount++;
		row.services.add(integrationLabel(alert.integration));
		if (alert.provenance.machineId) row.agents.add(alert.provenance.machineId);
		if (alert.provenance.sourceRange) ranges.add(alert.provenance.sourceRange);
		for (const event of alert.events) {
			row.services.add(integrationLabel(event.integration));
			const geo = event.facets.geo;
			country ??= geo?.isoCode;
			asName ??= geo?.asnOrg;
			if (!asNumber && geo?.asnNumber !== "0") asNumber = geo?.asnNumber;
			if (geo?.sourceRange) ranges.add(geo.sourceRange);
		}
		for (const [label, values] of Object.entries(observedValues(alert))) {
			if (!values.length) continue;
			const counts = targets.get(label) ?? new Map<string, number>();
			for (const value of values)
				counts.set(value, (counts.get(value) ?? 0) + 1);
			targets.set(label, counts);
		}
	}
	return {
		alertCount: ordered.length,
		scenarios: [...scenarios.values()]
			.sort(
				(a, b) =>
					b.latestAt.getTime() - a.latestAt.getTime() ||
					a.scenario.localeCompare(b.scenario),
			)
			.map((row) => ({
				...row,
				services: [...row.services],
				agents: [...row.agents],
				origins: [...row.origins],
			})),
		targets: [...targets].map(([label, counts]) => ({
			label,
			total: counts.size,
			values: [...counts]
				.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
				.slice(0, 20)
				.map(([value, alertCount]) => ({ value, alertCount })),
		})),
		network: { country, asName, asNumber, ranges: [...ranges] },
	};
}

export type HostActivity = ReturnType<typeof buildHostActivity>;

import { distinctValues, type MetaView } from "../meta";
import type {
	AppsecAggregates,
	AppsecEventFields,
	Integration,
} from "../types";

/** Rules the scenario fired on, aggregated across its events. */
function firedRules(alertMeta: MetaView): string[] | undefined {
	return alertMeta.list("rules");
}

/**
 * CrowdSec AppSec (WAF). Two event shapes, both handled here because they
 * describe the same thing:
 *
 *   log_type `appsec-block`: the verdict recorded by the AppSec component,
 *                            with the rule that fired and whether the request
 *                            was actually interrupted.
 *   in-band rule events:     emitted by the appsec datasource with no
 *                            log_type at all: `rule_name`, `message`, `uri`,
 *                            `matched_zones`, `data`.
 *
 * `entries[]` holds the rules that fired.
 */
export const appsec = {
	id: "appsec",
	label: "AppSec WAF",
	entryType: "rules",

	matches(meta) {
		const logType = meta.peek("log_type");
		if (logType === "appsec-block") return true;
		if (meta.peek("datasource_type") === "appsec") return true;
		// In-band rule events carry no log_type; the rule name is the giveaway.
		return meta.has("rule_name") || meta.has("matched_zones");
	},

	parseEvent(meta) {
		meta.skip("log_type", "service");
		return {
			kind: "appsec",
			action: meta.str("appsec_action"),
			interrupted: meta.bool("appsec_interrupted"),
			ruleName: meta.str("rule_name", "name"),
			ruleIds: meta.list("rule_ids"),
			description: meta.str("message", "msg"),
			matchedZones: meta.list("matched_zones"),
			method: meta.str("method", "http_verb"),
			requestUuid: meta.str("request_uuid"),
			remediationComponentIp: meta.str("remediation_cmpt_ip"),
			data: meta.str("data"),
		};
	},

	parseAggregates(alertMeta) {
		return {
			kind: "appsec",
			rules: firedRules(alertMeta),
			ruleNames: alertMeta.list("name"),
			descriptions: alertMeta.list("msg"),
			matchedZones: alertMeta.list("matched_zones"),
			methods: alertMeta.list("method"),
			targetUris: alertMeta.list("target_uri"),
		};
	},

	extractEntries({ events, alertMeta }) {
		// The scenario aggregates every rule it fired on; per-event names fill
		// in when it does not.
		return [
			...new Set([
				...(firedRules(alertMeta) ?? []),
				...distinctValues(events, (event) => event.str("rule_name", "name")),
			]),
		];
	},
} satisfies Integration<AppsecEventFields, AppsecAggregates>;

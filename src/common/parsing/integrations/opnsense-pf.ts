import type { MetaView } from "../meta";
import type { Integration, PfAggregates, PfEventFields } from "../types";

/** Ports live only on the alert, so the aggregate is the single reader. */
function destinationPorts(alertMeta: MetaView): string[] | undefined {
	return alertMeta.list("dst_port");
}

/**
 * OPNsense pf filter log, `log_type: pf_drop` / `pf_pass`. Covers the
 * firewallservices/* scenarios. `entries[]` holds destination ports, which live
 * only in the alert-level meta: the pf scenario aggregates them and individual
 * events never carry one.
 */
export const opnsensePf = {
	id: "opnsense-pf",
	label: "OPNsense",
	entryType: "ports",

	matches(meta) {
		const logType = meta.peek("log_type");
		if (logType === "pf_drop" || logType === "pf_pass") return true;
		return meta.has("iface") || meta.has("rulenr");
	},

	parseEvent(meta) {
		const logType = meta.str("log_type");
		return {
			kind: "opnsense-pf",
			action:
				logType === "pf_pass"
					? "pass"
					: logType === "pf_drop"
						? "drop"
						: undefined,
			interface: meta.str("iface"),
			ruleNumber: meta.str("rulenr"),
			ruleId: meta.str("ruleid"),
			machine: meta.str("machine"),
			protocol: meta.str("service", "proto"),
		};
	},

	parseAggregates(alertMeta) {
		return { kind: "opnsense-pf", dstPorts: destinationPorts(alertMeta) };
	},

	extractEntries({ alertMeta }) {
		return destinationPorts(alertMeta) ?? [];
	},
} satisfies Integration<PfEventFields, PfAggregates>;

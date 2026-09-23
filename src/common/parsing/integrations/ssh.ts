import { distinctValues, type MetaView } from "../meta";
import type { Integration, SshAggregates, SshEventFields } from "../types";

/** Usernames the scenario aggregated across its events. */
function usernames(alertMeta: MetaView): string[] | undefined {
	return alertMeta.list("target_user", "user", "username");
}

/**
 * sshd authentication events. `entries[]` holds the usernames tried.
 */
export const ssh = {
	id: "ssh",
	label: "SSH",
	entryType: "usernames",

	matches(meta) {
		const logType = meta.peek("log_type");
		if (logType?.startsWith("ssh_")) return true;
		if (logType === "auth" && meta.peek("service") === "ssh") return true;
		return meta.has("ssh_user");
	},

	parseEvent(meta) {
		meta.skip("log_type");
		return {
			kind: "ssh",
			user: meta.str("target_user", "ssh_user", "user"),
			service: meta.str("service"),
		};
	},

	parseAggregates(alertMeta) {
		return { kind: "ssh", usernames: usernames(alertMeta) };
	},

	extractEntries({ events, alertMeta }) {
		// The scenario aggregates every username it saw; per-event names fill
		// in when it does not.
		return [
			...new Set([
				...(usernames(alertMeta) ?? []),
				...distinctValues(events, (event) =>
					event.str("target_user", "ssh_user", "user"),
				),
			]),
		];
	},
} satisfies Integration<SshEventFields, SshAggregates>;

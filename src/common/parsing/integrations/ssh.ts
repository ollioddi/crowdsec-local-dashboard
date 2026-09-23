import { distinctValues, type MetaView } from "../meta";
import type { Integration, SshAggregates, SshEventFields } from "../types";

/** Usernames the scenario aggregated across its events. */
function usernames(alertMeta: MetaView): string[] | undefined {
	return alertMeta.list("user", "username");
}

/**
 * sshd auth log, `log_type: ssh_auth` / `auth`. Covers crowdsecurity/ssh-bf and
 * friends on every agent that ships /var/log/auth.log. `entries[]` holds the
 * usernames that were tried.
 */
export const ssh = {
	id: "ssh",
	label: "SSH",
	entryType: "usernames",

	matches(meta) {
		const logType = meta.peek("log_type");
		if (logType === "ssh_auth" || logType === "auth") return true;
		return meta.has("ssh_user");
	},

	parseEvent(meta) {
		meta.skip("log_type");
		return {
			kind: "ssh",
			user: meta.str("ssh_user", "user"),
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
				...distinctValues(events, (event) => event.str("ssh_user", "user")),
			]),
		];
	},
} satisfies Integration<SshEventFields, SshAggregates>;

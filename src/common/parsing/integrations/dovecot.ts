import type { MetaView } from "../meta";
import type {
	DovecotAggregates,
	DovecotEventFields,
	Integration,
} from "../types";

/** Mailboxes the scenario aggregated, from the agent's alert context. */
function mailboxes(alertMeta: MetaView): string[] | undefined {
	return alertMeta.list("target_user", "dovecot_user");
}

/**
 * Dovecot's reasons without the per-attempt detail: the password hash
 * fragment and the attempt timing. Otherwise every attempt reads as a new
 * reason.
 */
function loginMessages(alertMeta: MetaView): string[] | undefined {
	const messages = alertMeta.list("login_message", "dovecot_login_message");
	if (!messages) return undefined;
	return [
		...new Set(
			messages.map((message) =>
				message
					.replace(/ \(SHA1 of given password: [0-9a-f]+\)/, "")
					.replace(
						/\(auth failed, \d+ attempts? in \d+ secs?\)/,
						"(auth failed)",
					),
			),
		),
	];
}

/**
 * Dovecot authentication metadata captured from mailcow's Docker logs. The
 * hub parser keeps the mailbox, protocol and failure reason out of event meta,
 * so they only arrive through alert context. `entries[]` holds the mailboxes.
 */
export const dovecot = {
	id: "dovecot",
	label: "Dovecot",
	entryType: "usernames",
	matches: (meta) => meta.peek("log_type") === "dovecot_logs",
	parseEvent(meta) {
		meta.skip("log_type");
		// The datasource already names Docker containers; file sources do not.
		if (
			meta.peek("datasource_type") === "docker" &&
			meta.has("datasource_path")
		) {
			meta.skip("machine");
		}
		return {
			kind: "dovecot",
			loginResult: meta.str("dovecot_login_result"),
		};
	},

	parseAggregates(alertMeta) {
		return {
			kind: "dovecot",
			mailboxes: mailboxes(alertMeta),
			protocols: alertMeta.list("protocol"),
			loginMessages: loginMessages(alertMeta),
		};
	},

	extractEntries({ alertMeta }) {
		return mailboxes(alertMeta) ?? [];
	},
} satisfies Integration<DovecotEventFields, DovecotAggregates>;

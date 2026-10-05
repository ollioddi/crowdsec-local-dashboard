import type { MetaView } from "../meta";
import type {
	Integration,
	PostfixAggregates,
	PostfixEventFields,
} from "../types";

/**
 * What the client sent, without the line ending Postfix logs escaped as a
 * literal `\r` or `\n`.
 */
function clientLines(alertMeta: MetaView, key: string): string[] | undefined {
	return alertMeta.list(key)?.map((line) => {
		const withoutEnding = line.replace(/(\\+[rn])+$/, "");
		// A line break can be the entire pre-greeting violation. Keep it visible.
		return withoutEnding || line;
	});
}

/**
 * Postfix, from the hub's `postfix-logs` (smtpd, `log_type: postfix`) and
 * `postscreen-logs` (`service: postscreen`, no log_type at all) parsers.
 * Covers crowdsecurity/postfix-spam and crowdsecurity/postscreen-rbl, as
 * shipped by the mailcow and postfix collections. No `entries[]`: a mail
 * client has no short list of targets the way a web scanner has paths.
 * What the client sent only arrives through alert context.
 */
export const postfix = {
	id: "postfix",
	label: "Postfix",

	matches(meta) {
		if (meta.peek("log_type") === "postfix") return true;
		return meta.peek("service") === "postscreen";
	},

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
			kind: "postfix",
			service: meta.str("service"),
			violation: meta.str("pregreet"),
			category: meta.str("log_type_enh"),
			action: meta.str("action"),
			reason: meta.str("reason"),
			clientHostname: meta.str("source_hostname"),
		};
	},

	parseAggregates(alertMeta) {
		return {
			kind: "postfix",
			clientSent: clientLines(alertMeta, "client_sent"),
			lostAfter: alertMeta.list("lost_after"),
			commands: clientLines(alertMeta, "smtp_command"),
		};
	},
} satisfies Integration<PostfixEventFields, PostfixAggregates>;

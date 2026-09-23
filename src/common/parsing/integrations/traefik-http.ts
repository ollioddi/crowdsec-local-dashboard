import { distinctValues } from "../meta";
import type { HttpAggregates, HttpEventFields, Integration } from "../types";

/**
 * Traefik access log, `log_type: http_access-log`. Covers every
 * crowdsecurity/http-* scenario and the CVE scenarios that match on a request
 * path. `entries[]` holds the distinct paths that were requested.
 */
export const traefikHttp = {
	id: "traefik-http",
	label: "Traefik",
	entryType: "paths",

	matches(meta) {
		if (meta.peek("log_type") === "http_access-log") return true;
		return meta.has("http_verb") || meta.has("http_path");
	},

	parseEvent(meta) {
		meta.skip("log_type", "service");
		return {
			kind: "traefik-http",
			verb: meta.str("http_verb"),
			path: meta.str("http_path"),
			status: meta.num("http_status"),
			userAgent: meta.str("http_user_agent"),
			routerName: meta.str("traefik_router_name"),
			argsLength: meta.num("http_args_len"),
			authUser: meta.str("user"),
		};
	},

	parseAggregates(alertMeta) {
		return {
			kind: "traefik-http",
			methods: alertMeta.list("method"),
			statuses: alertMeta.list("status"),
			targetUris: alertMeta.list("target_uri"),
		};
	},

	extractEntries({ events }) {
		return distinctValues(events, (event) => event.str("http_path"));
	},
} satisfies Integration<HttpEventFields, HttpAggregates>;

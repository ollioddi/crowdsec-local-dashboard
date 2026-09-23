import { describe, expect, it } from "vitest";
import { MetaView, metaToRecord, recordToMeta } from "./meta";
import { parseAlert, parseEvent } from "./registry";

const meta = (values: Record<string, string>) =>
	Object.entries(values).map(([key, value]) => ({ key, value }));

// Fixtures are real meta, copied from `cscli alerts inspect <id> -o json` on a
// live LAPI (CrowdSec 1.8.1, Traefik 3.7 JSON access log).

/** crowdsecurity/thinkphp-cve-2018-20062 via the Traefik access log. */
const httpEvent = {
	timestamp: "2026-09-22T18:21:33Z",
	meta: meta({
		ASNNumber: "396982",
		ASNOrg: "GOOGLE-CLOUD-PLATFORM",
		IsInEU: "false",
		IsoCode: "US",
		SourceRange: "136.112.0.0/13",
		datasource_path: "/var/log/traefik/access.log",
		datasource_type: "file",
		http_args_len: "92",
		http_path: "/index.php?s=index/think/app/invokefunction",
		http_status: "403",
		http_user_agent: "Mozilla/5.0 (compatible; Claude-SearchBot/1.0)",
		http_verb: "GET",
		log_type: "http_access-log",
		service: "http",
		source_ip: "136.119.64.135",
		target_fqdn: "backup.example.com",
		timestamp: "2026-09-22T18:21:33Z",
		traefik_router_name: "error-pages-router@redis",
		user: "-",
	}),
};

/** The AppSec component's own verdict record. */
const appsecBlockEvent = {
	timestamp: "2026-09-22T11:31:13Z",
	meta: meta({
		appsec_action: "deny",
		appsec_interrupted: "true",
		datasource_path: "appsec",
		datasource_type: "appsec",
		log_type: "appsec-block",
		remediation_cmpt_ip: "172.20.0.1",
		request_uuid: "aa2f5ce5-30cd-4dfe-9a38-84a8e428ed52",
		rule_ids: "[2410974272]",
		rule_name: "crowdsecurity/vpatch-CVE-2025-29927",
		service: "appsec",
		source_ip: "136.119.64.135",
		target_host: "backup.example.com",
		target_uri: "/",
	}),
};

/** In-band rule event: no log_type at all. */
const appsecRuleEvent = {
	timestamp: "2026-09-22T18:00:00Z",
	meta: meta({
		data: "",
		matched_zones: "REQUEST_HEADERS_NAMES.X-Middleware-Subrequest",
		message: "Next.js Middleware Bypass - (CVE-2025-29927)",
		rule_name: "crowdsecurity/vpatch-CVE-2025-29927",
		target_fqdn: "backup.example.com",
		uri: "/resources/..%2F..%2F.env",
	}),
};

/** firewallservices/pf-scan-multi_ports from the OPNsense agent. */
const pfEvent = {
	timestamp: "2026-09-22T04:22:18Z",
	meta: meta({
		ASNNumber: "9009",
		ASNOrg: "M247 Europe SRL",
		IsInEU: "true",
		IsoCode: "ES",
		SourceRange: "37.120.144.0/20",
		datasource_path: "/var/log/filter/latest.log",
		datasource_type: "file",
		iface: "em0",
		log_type: "pf_drop",
		machine: "OPNsense.example.lan",
		ruleid: "02f4bab031b57d1e30553ce08e0ec131",
		rulenr: "11",
		service: "tcp",
		source_ip: "37.120.148.140",
	}),
};

describe("traefik-http", () => {
	const parsed = parseEvent(httpEvent);

	it("claims the access log and types its fields", () => {
		expect(parsed.integration).toBe("traefik-http");
		expect(parsed.fields).toMatchObject({
			kind: "traefik-http",
			verb: "GET",
			status: 403,
			argsLength: 92,
			routerName: "error-pages-router@redis",
		});
	});

	it("exposes the attacked hostname as a facet", () => {
		expect(parsed.facets.target?.fqdn).toBe("backup.example.com");
	});

	it("treats CrowdSec's `-` sentinel as absent", () => {
		expect(parsed.fields).toMatchObject({
			kind: "traefik-http",
			authUser: undefined,
		});
	});

	it("enriches geo from the enrich stage", () => {
		expect(parsed.facets.geo).toMatchObject({
			asnNumber: "396982",
			isoCode: "US",
			isInEU: false,
			sourceRange: "136.112.0.0/13",
		});
	});

	it("claims every key it knows about", () => {
		expect(parsed.unparsed).toEqual({});
	});
});

describe("appsec", () => {
	it("parses a block verdict", () => {
		const parsed = parseEvent(appsecBlockEvent);
		expect(parsed.integration).toBe("appsec");
		expect(parsed.fields).toMatchObject({
			kind: "appsec",
			action: "deny",
			interrupted: true,
			ruleName: "crowdsecurity/vpatch-CVE-2025-29927",
			ruleIds: ["2410974272"],
			requestUuid: "aa2f5ce5-30cd-4dfe-9a38-84a8e428ed52",
		});
		// target_host here, target_fqdn elsewhere: normalised to one facet
		expect(parsed.facets.target?.fqdn).toBe("backup.example.com");
	});

	it("claims an in-band rule event that has no log_type", () => {
		const parsed = parseEvent(appsecRuleEvent);
		expect(parsed.integration).toBe("appsec");
		expect(parsed.fields).toMatchObject({
			kind: "appsec",
			description: "Next.js Middleware Bypass - (CVE-2025-29927)",
			matchedZones: ["REQUEST_HEADERS_NAMES.X-Middleware-Subrequest"],
		});
		expect(parsed.facets.target?.uri).toBe("/resources/..%2F..%2F.env");
	});
});

describe("opnsense-pf", () => {
	it("parses the drop and takes ports from the alert aggregate", () => {
		const parsed = parseEvent(pfEvent);
		expect(parsed.fields).toMatchObject({
			kind: "opnsense-pf",
			action: "drop",
			interface: "em0",
			ruleNumber: "11",
			machine: "OPNsense.example.lan",
			protocol: "tcp",
		});

		const alert = parseAlert({
			events: [pfEvent],
			meta: meta({ dst_port: '["tcp:3389","tcp:445"]' }),
		});
		expect(alert.integration).toBe("opnsense-pf");
		expect(alert.entryType).toBe("ports");
		expect(alert.entries).toEqual(["tcp:3389", "tcp:445"]);
		expect(alert.aggregates).toEqual({
			kind: "opnsense-pf",
			dstPorts: ["tcp:3389", "tcp:445"],
		});
	});
});

describe("unknown meta", () => {
	it("keeps log_type visible for a source no integration claims", () => {
		// matches() peeks rather than reads: claiming log_type there would hide
		// the one key that says what the unrecognised source is
		const parsed = parseEvent({
			meta: meta({ log_type: "nextcloud", target_user: "admin" }),
		});
		expect(parsed.integration).toBe("unknown");
		expect(parsed.unparsed).toEqual({
			log_type: "nextcloud",
			target_user: "admin",
		});
	});

	it("keeps keys no parser claimed instead of dropping them", () => {
		const parsed = parseEvent({
			timestamp: "2026-09-22T18:21:33Z",
			meta: meta({
				log_type: "http_access-log",
				http_path: "/",
				tls_version: "1.3",
				some_future_key: "value",
			}),
		});
		expect(parsed.unparsed).toEqual({
			tls_version: "1.3",
			some_future_key: "value",
		});
	});

	it("falls back to the unknown integration, keeping the whole bag", () => {
		const parsed = parseEvent({ meta: meta({ weird_source: "yes" }) });
		expect(parsed.integration).toBe("unknown");
		expect(parsed.fields).toEqual({ kind: "unknown" });
		expect(parsed.unparsed).toEqual({ weird_source: "yes" });
	});
});

describe("alert envelope", () => {
	const alert = parseAlert({
		events: [httpEvent],
		meta: meta({
			method: '["GET"]',
			status: '["403"]',
			user_agent: '["Mozilla/5.0 (compatible; Claude-SearchBot/1.0)"]',
			target_uri: '["/index.php"]',
			ja4h: '["ge11nn110000_650518e5d91b"]',
			cve: '["CVE-2025-31324"]',
			some_future_key: "value",
		}),
	});

	it("keeps ja4h and user agents as cross-integration facets", () => {
		expect(alert.facets.client?.ja4h).toEqual(["ge11nn110000_650518e5d91b"]);
		expect(alert.facets.cves).toEqual(["CVE-2025-31324"]);
	});

	it("narrows aggregates to the integration that produced them", () => {
		expect(alert.aggregates).toEqual({
			kind: "traefik-http",
			methods: ["GET"],
			statuses: ["403"],
			targetUris: ["/index.php"],
		});
	});

	it("keeps alert-level keys no aggregate claimed", () => {
		expect(alert.unparsed).toEqual({ some_future_key: "value" });
	});

	it("resolves the integration by majority, not by first event", () => {
		const mixed = parseAlert({
			events: [httpEvent, appsecRuleEvent, appsecBlockEvent],
		});
		expect(mixed.integration).toBe("appsec");
		expect(mixed.entryType).toBe("rules");
		expect(mixed.entries).toEqual(["crowdsecurity/vpatch-CVE-2025-29927"]);
	});

	it("breaks a tie by registration order, not event order", () => {
		// appsec is registered before traefik-http, so it wins either way
		expect(
			parseAlert({ events: [httpEvent, appsecBlockEvent] }).integration,
		).toBe("appsec");
		expect(
			parseAlert({ events: [appsecBlockEvent, httpEvent] }).integration,
		).toBe("appsec");
	});
});

describe("meta helpers", () => {
	it("round-trips CrowdSec's key/value list through the stored record", () => {
		const entries = meta({ a: "1", b: "2" });
		expect(recordToMeta(metaToRecord(entries))).toEqual(entries);
	});

	it("parses JSON lists, keeps a scalar, and drops an all-blank list", () => {
		const view = new MetaView(
			meta({ list: '["a","-","b"]', scalar: "x", blank: '["-",""]' }),
		);
		expect(view.list("list")).toEqual(["a", "b"]);
		expect(view.list("scalar")).toEqual(["x"]);
		expect(view.list("blank")).toBeUndefined();
		expect(view.list("missing")).toBeUndefined();
	});

	it("treats the `-` sentinel as absent in has() as well as peek()", () => {
		// traefik matches on has("http_verb"); a `-` verb must not claim the event
		const parsed = parseEvent({ meta: meta({ http_verb: "-", foo: "bar" }) });
		expect(parsed.integration).toBe("unknown");
	});
});

describe("SSH upstream metadata", () => {
	// Constructed from crowdsecurity/sshd-logs; not a captured alert.
	it("reads ssh_failed-auth and target_user", () => {
		const parsed = parseAlert({
			events: [
				{
					meta: meta({
						log_type: "ssh_failed-auth",
						service: "ssh",
						target_user: "root",
					}),
				},
			],
			meta: meta({ target_user: '["root","admin"]' }),
		});
		expect(parsed.integration).toBe("ssh");
		expect(parsed.events[0].fields).toMatchObject({
			user: "root",
			service: "ssh",
		});
		expect(parsed.entries).toEqual(["root", "admin"]);
		expect(parsed.events[0].unparsed).toEqual({});
	});

	it("does not claim another service's auth event", () => {
		const parsed = parseEvent({
			meta: meta({ log_type: "auth", service: "mail", user: "alice" }),
		});
		expect(parsed.integration).toBe("unknown");
		expect(parsed.unparsed.log_type).toBe("auth");
	});

	it("excludes another source's username from the SSH entry list", () => {
		const parsed = parseAlert({
			events: [
				{ meta: meta({ log_type: "ssh_failed-auth", target_user: "root" }) },
				{ meta: meta({ log_type: "ssh_failed-auth", target_user: "admin" }) },
				{ meta: meta({ log_type: "http_access-log", user: "web-user" }) },
			],
		});
		expect(parsed.entries).toEqual(["root", "admin"]);
	});
});

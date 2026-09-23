import type { AlertEntryType as PrismaAlertEntryType } from "@/generated/prisma/enums";
import type { MetaView } from "./meta";

/** Who produced the event. */
export type IntegrationId =
	| "traefik-http"
	| "opnsense-pf"
	| "appsec"
	| "ssh"
	| "unknown";

/**
 * What `entries[]` holds. Taken from the Prisma enum rather than restated, so
 * the two cannot drift: adding a kind means editing the schema and migrating.
 */
export type AlertEntryType = PrismaAlertEntryType;

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

/** GeoIP/ASN enrichment; CrowdSec's own enrich stage adds it to every event. */
export type GeoFacet = {
	asnNumber?: string;
	asnOrg?: string;
	isoCode?: string;
	isInEU?: boolean;
	sourceRange?: string;
};

/**
 * What the request was aimed at. `fqdn` is the Host header the client asked
 * for; the router/service that answered is integration-specific and stays in
 * the integration's own fields.
 */
export type TargetFacet = {
	fqdn?: string;
	uri?: string;
};

/** The vulnerability a probe is shopping for. */
export type CveFacet = {
	id: string;
};

/** The stack a probe assumes, e.g. `generic-phpinfo`. */
export type TechnologyFacet = {
	name: string;
};

/** Client fingerprints that survive IP and User-Agent rotation. */
export type FingerprintFacet = {
	ja4h?: string;
};

/**
 * Alert-level facets: the few values that genuinely appear across
 * integrations. Everything else belongs to exactly one integration's
 * aggregates, so it stays out of here.
 */
export type ClientAlertFacet = {
	userAgents?: string[];
	ja4h?: string[];
};

export type AlertFacets = {
	client?: ClientAlertFacet;
	cves?: string[];
};

/** One optional slot per facet; see `EventFacetDef` for how to add one. */
export type EventFacets = {
	geo?: GeoFacet;
	target?: TargetFacet;
	cve?: CveFacet;
	technology?: TechnologyFacet;
	fingerprint?: FingerprintFacet;
};

/**
 * A facet: a slice that cuts across integrations. GeoIP enrichment, a CVE id,
 * the attacked hostname, a fingerprint: any event from any integration may
 * carry one. Adding one means one file written as
 * `{ ... } satisfies EventFacetDef<"name">`, one line in
 * `facets/extract-facets.ts`, and one key on `EventFacets`.
 */
export type EventFacetDef<K extends keyof EventFacets> = {
	id: K;
	extract(meta: MetaView): EventFacets[K] | undefined;
};

// ---------------------------------------------------------------------------
// Integration event fields
// ---------------------------------------------------------------------------

export type HttpEventFields = {
	kind: "traefik-http";
	verb?: string;
	path?: string;
	status?: number;
	userAgent?: string;
	/** Traefik router that matched, e.g. `mailcow@file`. */
	routerName?: string;
	/** Query-string length: a bare probe versus a payload. */
	argsLength?: number;
	/** HTTP auth user from the access log. */
	authUser?: string;
};

export type PfEventFields = {
	kind: "opnsense-pf";
	action?: "drop" | "pass";
	interface?: string;
	ruleNumber?: string;
	ruleId?: string;
	/** Firewall host that logged it, e.g. `OPNsense.example.lan`. */
	machine?: string;
	/** Transport as pf reports it: tcp, udp… */
	protocol?: string;
};

export type AppsecEventFields = {
	kind: "appsec";
	/** `deny`, `allow`, `captcha`… as the AppSec component decided. */
	action?: string;
	/** Whether the request was actually interrupted, not just matched. */
	interrupted?: boolean;
	ruleName?: string;
	ruleIds?: string[];
	/** Human-readable rule description, e.g. "Detect access to .env files". */
	description?: string;
	/** Which part of the request matched, e.g. `REQUEST_HEADERS_NAMES.X-…`. */
	matchedZones?: string[];
	method?: string;
	/** Correlates the WAF verdict with the access-log line. */
	requestUuid?: string;
	/** The bouncer that asked for the verdict. */
	remediationComponentIp?: string;
	/** Raw matched payload, when the rule captured one. */
	data?: string;
};

export type SshEventFields = {
	kind: "ssh";
	user?: string;
	service?: string;
};

export type UnknownEventFields = {
	kind: "unknown";
};

export type EventFields =
	| HttpEventFields
	| PfEventFields
	| AppsecEventFields
	| SshEventFields
	| UnknownEventFields;

// ---------------------------------------------------------------------------
// Parsed shapes handed to the UI
// ---------------------------------------------------------------------------

export type ParsedEvent = {
	integration: IntegrationId;
	/** Null when the event carries no parseable timestamp. */
	timestamp: Date | null;
	sourceIp?: string;
	/** Where CrowdSec read it: a file path, or `appsec` for in-band events. */
	datasourcePath?: string;
	datasourceType?: string;
	fields: EventFields;
	facets: EventFacets;
	/** Meta keys no parser claimed. Never empty-checked away. */
	unparsed: Record<string, string>;
};

/**
 * Alert-level aggregates, one shape per integration.
 *
 * CrowdSec repeats per-event values on the alert as JSON arrays, and adds a
 * few that exist nowhere else. Kept as a discriminated union rather than one
 * bag of optionals, so an HTTP alert cannot appear to have `dstPorts` and a
 * reader can see at a glance which fields belong to which source.
 */
export type HttpAggregates = {
	kind: "traefik-http";
	methods?: string[];
	statuses?: string[];
	targetUris?: string[];
};

export type AppsecAggregates = {
	kind: "appsec";
	/** Every rule the scenario fired on, not just this event's. */
	rules?: string[];
	ruleNames?: string[];
	descriptions?: string[];
	matchedZones?: string[];
	methods?: string[];
	targetUris?: string[];
};

export type PfAggregates = {
	kind: "opnsense-pf";
	/** Lives only here: pf events carry no destination port. */
	dstPorts?: string[];
};

export type SshAggregates = {
	kind: "ssh";
	usernames?: string[];
};

export type UnknownAggregates = {
	kind: "unknown";
};

export type AlertAggregates =
	| HttpAggregates
	| AppsecAggregates
	| PfAggregates
	| SshAggregates
	| UnknownAggregates;

/**
 * An integration: who produced the log line. Traefik, OPNsense pf, the AppSec
 * WAF, sshd. One integration owns an event's shape end to end: the fields it
 * yields, what `entries[]` holds, and how the UI groups it. Adding one means
 * one file written as `{ ... } satisfies Integration<XEventFields, XAggregates>`
 * plus one line in `integrations/integrations.ts`.
 *
 * The id is the `kind` of the fields it yields: one name per source, which
 * is what lets the UI hand each renderer only its own, already-typed events.
 *
 * Anything no integration or facet claims survives in `unparsed`, so a new
 * CrowdSec field is visible in the UI before a parser knows about it.
 */
export type Integration<
	F extends EventFields = EventFields,
	A extends AlertAggregates = AlertAggregates,
> = {
	id: IntegrationId & F["kind"] & A["kind"];
	label: string;
	/** Claims an event. Evaluated in registration order; first match wins. */
	matches(meta: MetaView): boolean;
	parseEvent(meta: MetaView): F;
	/** Alert-level meta this integration owns. Leave out when there is none. */
	parseAggregates?(alertMeta: MetaView): A;
	/** What `entries[]` holds. Leave both out when the source has no short list. */
	entryType?: AlertEntryType;
	extractEntries?(source: {
		events: MetaView[];
		alertMeta: MetaView;
	}): string[];
};

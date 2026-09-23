import { Info } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { describeWindow, formatShortDateTime } from "@/common/lib/dates";
import { integrationLabel } from "@/common/parsing/registry";
import type { IntegrationId } from "@/common/parsing/types";
import type {
	AlertDetail,
	AlertDetailEvent,
} from "@/features/decisions/api/alert-detail";
import { shortScenario } from "../columns";
import { appsecEvidence } from "./appsec-evidence";
import { collectDetails, collectUnparsed } from "./details";
import { httpEvidence } from "./http-evidence";
import { pfEvidence } from "./pf-evidence";
import {
	type EvidenceProps,
	type EvidenceRenderer,
	FieldGrid,
	Labeled,
	Section,
} from "./shared";
import { sshEvidence } from "./ssh-evidence";
import { unknownEvidence } from "./unknown-evidence";

/**
 * One renderer per integration, mirroring `common/parsing/integrations`. To
 * support a new source: write the parser, write a renderer, add it here.
 * TypeScript reports the missing key, since this is keyed by `IntegrationId`.
 */
const RENDERERS: { [K in IntegrationId]: EvidenceRenderer<K> } = {
	"traefik-http": httpEvidence,
	appsec: appsecEvidence,
	"opnsense-pf": pfEvidence,
	ssh: sshEvidence,
	unknown: unknownEvidence,
};

/** Fields a renderer draws, so "Other fields" can skip them. */
function shownFields(kind: IntegrationId): ReadonlySet<string> {
	return RENDERERS[kind].shownFields as ReadonlySet<string>;
}

/**
 * Events grouped by the kind of fields they carry, which is the integration
 * that claimed them, the alert's own integration first (even with no events,
 * so its renderer can show the aggregate). An alert can mix sources, so every
 * present one renders. Grouping on `fields.kind` is what makes handing each
 * renderer its narrowed events sound.
 */
function eventsByKind(
	alert: AlertDetail,
): Array<[IntegrationId, AlertDetailEvent[]]> {
	const groups = new Map<IntegrationId, AlertDetailEvent[]>([
		[alert.integration, []],
	]);
	for (const event of alert.events) {
		const kind = event.fields.kind;
		const group = groups.get(kind);
		if (group) group.push(event);
		else groups.set(kind, [event]);
	}
	return [...groups];
}

/** Distinct values of one field across the events, plus any alert-level ones. */
function distinct(
	alert: AlertDetail,
	pick: (event: AlertDetailEvent) => string | undefined,
	alertLevel: string[] = [],
): string[] {
	const seen = new Set(alertLevel);
	for (const event of alert.events) {
		const value = pick(event);
		if (value) seen.add(value);
	}
	return [...seen];
}

/** "10 leaking 10s": how full the bucket had to get, and how fast it drains. */
function describeBucket(
	capacity: number | null,
	leakspeed: string | null,
): string | null {
	if (capacity === null) return null;
	return leakspeed ? `${capacity} leaking ${leakspeed}` : String(capacity);
}

function yesNo(value: boolean | null): string {
	if (value === null) return "-";
	return value ? "yes" : "no";
}

/**
 * What the alert is: scenario, source, size, and when, then the bucket and
 * ids LAPI attached to it. The same two lines for every alert; a value LAPI
 * did not send reads as absent rather than moving the others around.
 */
function Header({ alert }: Readonly<{ alert: AlertDetail }>) {
	const span = describeWindow(alert.startAt, alert.stopAt);
	const {
		scenarioVersion,
		capacity,
		leakspeed,
		remediation,
		sourceScope,
		uuid,
	} = alert.provenance;
	return (
		<div className="space-y-1 text-xs">
			<p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground">
				<span className="font-semibold text-foreground">
					{shortScenario(alert.scenario)}
				</span>
				<span>
					{integrationLabel(alert.integration)}
					{" · "}
					{alert.eventsCount} event{alert.eventsCount === 1 ? "" : "s"}
					{span && ` ${span}`}
					{" · "}
					{formatShortDateTime(alert.createdAt)}
				</span>
				{alert.provenance.simulated && (
					<Badge variant="warning" className="h-5 px-1.5 text-[10px]">
						simulated
					</Badge>
				)}
			</p>
			<p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
				<Labeled label="Scenario version">{scenarioVersion ?? "-"}</Labeled>
				<Labeled label="Bucket">
					{describeBucket(capacity, leakspeed) ?? "-"}
				</Labeled>
				<Labeled label="Scope">{sourceScope ?? "-"}</Labeled>
				<Labeled label="Remediated">{yesNo(remediation)}</Labeled>
				<Labeled label="Alert id" className="font-mono">
					{uuid ?? "-"}
				</Labeled>
			</p>
		</div>
	);
}

type TagGroup = {
	label: string;
	values: string[];
	variant: "destructive" | "outline";
};

/**
 * What the alert says about the client as a whole: the vulnerability it was
 * shopping for, the stack it assumed, and the JA4H fingerprint that survives
 * IP and user-agent rotation. Per-request values stay on the request lines.
 */
function Client({ alert }: Readonly<{ alert: AlertDetail }>) {
	const groups: TagGroup[] = [
		{
			label: "CVE",
			values: distinct(alert, (e) => e.facets.cve?.id, alert.facets.cves),
			variant: "destructive" as const,
		},
		{
			label: "Technology",
			values: distinct(alert, (e) => e.facets.technology?.name),
			variant: "outline" as const,
		},
	].filter((group) => group.values.length > 0);
	const ja4h = distinct(
		alert,
		(e) => e.facets.fingerprint?.ja4h,
		alert.facets.client?.ja4h,
	);
	if (groups.length === 0 && ja4h.length === 0) return null;
	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
			{groups.map(({ label, values, variant }) => (
				<Labeled key={label} label={label}>
					{values.map((value) => (
						<Badge
							key={value}
							variant={variant}
							className="mr-1 h-5 px-1.5 text-[10px]"
						>
							{value}
						</Badge>
					))}
				</Labeled>
			))}
			{ja4h.length > 0 && (
				<Labeled label="JA4H" className="font-mono">
					{ja4h.join(", ")}
				</Labeled>
			)}
		</div>
	);
}

interface AlertEvidenceProps {
	alert: AlertDetail;
	/** The decision's IP; the disclosure repeats a source IP only when different. */
	hostIp: string;
}

/**
 * The evidence for one alert, flat and always in the same order: header,
 * client facets, the per-integration list, then every remaining parsed field
 * and every unparsed key, inline. Nothing hides behind a toggle and nothing
 * here repeats the facts column.
 */
export function AlertEvidence({ alert, hostIp }: Readonly<AlertEvidenceProps>) {
	const details = collectDetails(alert, hostIp, shownFields);
	const unparsed = collectUnparsed(alert);
	const detailCount = Object.keys(details).length;
	const unparsedCount = Object.keys(unparsed).length;
	return (
		<div data-slot="alert-evidence" className="space-y-2">
			<Header alert={alert} />
			<Client alert={alert} />
			{eventsByKind(alert).map(([kind, events]) => {
				// Narrowed by the grouping above; the one cast in the pipeline
				const { Component } = RENDERERS[
					kind
				] as EvidenceRenderer<IntegrationId>;
				return (
					<Component
						key={kind}
						alert={alert}
						events={events as EvidenceProps["events"]}
					/>
				);
			})}
			{detailCount > 0 && (
				<Section label="Other fields">
					<FieldGrid values={details} />
				</Section>
			)}
			{unparsedCount > 0 && (
				<Section label="Not parsed">
					<FieldGrid values={unparsed} />
				</Section>
			)}
		</div>
	);
}

/** Blank space does not explain why there is no evidence. */
export function NoEvidence() {
	return (
		<p className="flex items-start gap-2 rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
			<Info className="mt-0.5 size-3.5 shrink-0" />
			<span>
				No alert evidence stored for this decision. CrowdSec keeps the
				triggering log lines only for a limited window, and decisions from
				blocklists or <code className="font-mono">cscli</code> never have any.
			</span>
		</p>
	);
}

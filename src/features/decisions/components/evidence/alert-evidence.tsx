import { Info } from "lucide-react";
import type { ComponentType } from "react";
import { Badge } from "@/common/components/ui/badge";
import { describeWindow, formatShortDateTime } from "@/common/lib/dates";
import { integrationLabel } from "@/common/parsing/registry";
import type { IntegrationId } from "@/common/parsing/types";
import type {
	AlertDetail,
	AlertDetailEvent,
} from "@/features/decisions/api/alert-detail";
import { shortScenario } from "../columns";
import { AppsecEvidence } from "./appsec-evidence";
import { collectDetails, collectUnparsed } from "./details";
import { HttpEvidence } from "./http-evidence";
import { PfEvidence } from "./pf-evidence";
import { type EvidenceProps, ExtraMeta } from "./shared";
import { SshEvidence } from "./ssh-evidence";
import { UnknownEvidence } from "./unknown-evidence";

/**
 * One renderer per integration, mirroring `common/parsing/integrations`. To
 * support a new source: write the parser, write a renderer, add it here.
 * TypeScript reports the missing key, since this is keyed by `IntegrationId`.
 */
const RENDERERS: Record<IntegrationId, ComponentType<EvidenceProps>> = {
	"traefik-http": HttpEvidence,
	appsec: AppsecEvidence,
	"opnsense-pf": PfEvidence,
	ssh: SshEvidence,
	unknown: UnknownEvidence,
};

/**
 * Events grouped by the integration that claimed them, the alert's own
 * integration first (even with no events, so its renderer can show the
 * aggregate). An alert can mix sources, so every present one renders.
 */
function eventsByIntegration(
	alert: AlertDetail,
): Array<[IntegrationId, AlertDetailEvent[]]> {
	const groups = new Map<IntegrationId, AlertDetailEvent[]>([
		[alert.integration, []],
	]);
	for (const event of alert.events) {
		const group = groups.get(event.integration);
		if (group) group.push(event);
		else groups.set(event.integration, [event]);
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

function Header({ alert }: Readonly<{ alert: AlertDetail }>) {
	const span = describeWindow(alert.startAt, alert.stopAt);
	const { machineId, simulated } = alert.provenance;
	return (
		<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
			<span className="text-xs font-semibold" title={alert.message}>
				{shortScenario(alert.scenario)}
			</span>
			<Badge variant="secondary" className="px-1 py-0 text-[10px]">
				{integrationLabel(alert.integration)}
			</Badge>
			{simulated && (
				<Badge variant="outline" className="px-1 py-0 text-[10px]">
					simulated
				</Badge>
			)}
			<span className="text-xs text-muted-foreground">
				{alert.eventsCount} event{alert.eventsCount === 1 ? "" : "s"}
				{span && ` ${span}`}
				{" · "}
				{formatShortDateTime(alert.createdAt)}
				{machineId && ` · seen by ${machineId}`}
			</span>
		</div>
	);
}

/** Which of my hostnames was aimed at, and what answered. */
function Targets({ alert }: Readonly<{ alert: AlertDetail }>) {
	const targets = distinct(alert, (e) => e.facets.target?.fqdn);
	const routers = distinct(alert, (e) =>
		e.fields.kind === "traefik-http" ? e.fields.routerName : undefined,
	);
	if (targets.length === 0 && routers.length === 0) return null;
	return (
		<p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
			{targets.length > 0 && (
				<span className="font-mono text-foreground">{targets.join(", ")}</span>
			)}
			{routers.length > 0 && (
				<span title="Traefik router that served the request">
					via {routers.join(", ")}
				</span>
			)}
		</p>
	);
}

/** User agent, CVE and technology tags, and the JA4H fingerprint. */
function ClientFacets({ alert }: Readonly<{ alert: AlertDetail }>) {
	const agents = distinct(
		alert,
		(e) => (e.fields.kind === "traefik-http" ? e.fields.userAgent : undefined),
		alert.facets.client?.userAgents,
	);
	const cves = distinct(alert, (e) => e.facets.cve?.id, alert.facets.cves);
	const technologies = distinct(alert, (e) => e.facets.technology?.name);
	const ja4h = distinct(
		alert,
		(e) => e.facets.fingerprint?.ja4h,
		alert.facets.client?.ja4h,
	);
	return (
		<>
			{agents.length > 0 && (
				<p
					className="truncate font-mono text-[11px] text-muted-foreground"
					title={agents.join("\n")}
				>
					UA: {agents[0]}
					{agents.length > 1 && ` +${agents.length - 1} more`}
				</p>
			)}
			{(cves.length > 0 || technologies.length > 0) && (
				<div className="flex flex-wrap gap-1">
					{cves.map((cve) => (
						<Badge
							key={cve}
							variant="destructive"
							className="px-1 py-0 text-[10px]"
						>
							{cve}
						</Badge>
					))}
					{technologies.map((tech) => (
						<Badge
							key={tech}
							variant="outline"
							className="px-1 py-0 text-[10px]"
						>
							{tech}
						</Badge>
					))}
				</div>
			)}
			{/* Survives IP and User-Agent rotation, so it is worth showing raw */}
			{ja4h.length > 0 && (
				<p
					className="truncate font-mono text-[10px] text-muted-foreground"
					title={`JA4H client fingerprint\n${ja4h.join("\n")}`}
				>
					JA4H: {ja4h.join(", ")}
				</p>
			)}
		</>
	);
}

/** The bucket that fired and the announced range of the source. */
function BucketLine({ alert }: Readonly<{ alert: AlertDetail }>) {
	const { capacity, leakspeed, sourceRange } = alert.provenance;
	if (capacity === null && !sourceRange) return null;
	return (
		<p className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
			{capacity !== null && (
				<span title="Bucket capacity and leak rate that fired the scenario">
					bucket {capacity}
					{leakspeed ? ` / ${leakspeed}` : ""}
				</span>
			)}
			{sourceRange && (
				<span title="Announced range of the source IP">{sourceRange}</span>
			)}
		</p>
	);
}

/**
 * The evidence box for one alert. Everything around the per-integration
 * renderer (header, targets, facets, provenance, the Details and Unparsed
 * disclosures) is integration-agnostic and rendered once, here.
 */
export function AlertEvidence({ alert }: Readonly<{ alert: AlertDetail }>) {
	return (
		<div
			data-slot="alert-evidence"
			className="space-y-2 rounded-lg border bg-muted/20 p-2.5"
		>
			<Header alert={alert} />
			<Targets alert={alert} />
			{eventsByIntegration(alert).map(([id, events]) => {
				const Renderer = RENDERERS[id];
				return <Renderer key={id} alert={alert} events={events} />;
			})}
			<ClientFacets alert={alert} />
			<BucketLine alert={alert} />
			<div className="flex flex-wrap gap-x-4">
				<ExtraMeta values={collectDetails(alert)} label="Details" />
				<ExtraMeta values={collectUnparsed(alert)} label="Unparsed metadata" />
			</div>
		</div>
	);
}

/** Blank space does not explain why there is no evidence. */
export function NoEvidence() {
	return (
		<p className="flex items-start gap-2 rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
			<Info className="mt-0.5 size-3.5 shrink-0" />
			<span>
				No alert evidence stored for this decision. CrowdSec keeps the
				triggering log lines only for a limited window, and decisions from
				blocklists or <code className="font-mono">cscli</code> never have any.
			</span>
		</p>
	);
}

import { Badge } from "@/common/components/ui/badge";
import { formatTime } from "@/common/lib/dates";
import type { AppsecEventFields } from "@/common/parsing/types";
import {
	EventList,
	type EventOf,
	type EvidenceProps,
	type EvidenceRenderer,
	Labeled,
	Line,
} from "./shared";

/** "deny" when the WAF blocked, "detected" when it only matched. */
function verdict(fields: AppsecEventFields): string | undefined {
	if (fields.interrupted === undefined) return undefined;
	if (!fields.interrupted) return "detected";
	return fields.action ?? "blocked";
}

function RuleHeading({ event }: Readonly<{ event: EventOf<"appsec"> }>) {
	const { fields } = event;
	const label = verdict(fields);
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{label && (
				<Badge
					variant={fields.interrupted ? "destructive" : "outline"}
					className="h-5 px-1.5 text-[10px]"
				>
					{label}
				</Badge>
			)}
			<span className="break-all font-mono text-[11px] font-semibold">
				{fields.ruleName?.replace(/^crowdsecurity\//, "") ?? "unnamed rule"}
			</span>
			{fields.description && (
				<span className="text-[11px] text-muted-foreground">
					{fields.description}
				</span>
			)}
			{event.timestamp && (
				<span className="ml-auto font-mono tabular-nums text-muted-foreground">
					{formatTime(event.timestamp)}
				</span>
			)}
		</div>
	);
}

/** What matched and the ids that tie the verdict to the log and the bouncer. */
function RuleDetails({ fields }: Readonly<{ fields: AppsecEventFields }>) {
	const { matchedZones, data, ruleIds, requestUuid, remediationComponentIp } =
		fields;
	return (
		<div className="flex flex-col gap-0.5 font-mono text-[11px]">
			{matchedZones && matchedZones.length > 0 && (
				<Labeled label="Matched">{matchedZones.join(", ")}</Labeled>
			)}
			{data && <Labeled label="Payload">{data}</Labeled>}
			{ruleIds && ruleIds.length > 0 && (
				<Labeled label="Rule ids">{ruleIds.join(", ")}</Labeled>
			)}
			{requestUuid && <Labeled label="Request">{requestUuid}</Labeled>}
			{remediationComponentIp && (
				<Labeled label="Bouncer">{remediationComponentIp}</Labeled>
			)}
		</div>
	);
}

function RuleHit({ event }: Readonly<{ event: EventOf<"appsec"> }>) {
	const { fqdn, uri } = event.facets.target ?? {};
	return (
		<div className="space-y-1 px-2 py-1.5 text-xs">
			<RuleHeading event={event} />
			<Line tag={event.fields.method}>
				<p className="break-all">
					{fqdn && <span className="text-muted-foreground">{fqdn}</span>}
					{uri ?? "-"}
				</p>
			</Line>
			<RuleDetails fields={event.fields} />
		</div>
	);
}

/**
 * AppSec (WAF) evidence, one block per rule hit. Every block has the same
 * shape: verdict and rule, the request, then labelled rows for what matched
 * and the ids that tie the verdict to the access log and the bouncer.
 */
function AppsecEvidence({ events }: EvidenceProps<"appsec">) {
	if (events.length === 0) return null;
	return (
		<EventList label={`Rules fired (${events.length})`}>
			{events.map((event) => (
				<RuleHit key={event.id} event={event} />
			))}
		</EventList>
	);
}

export const appsecEvidence = {
	Component: AppsecEvidence,
	shownFields: new Set([
		"action",
		"interrupted",
		"ruleName",
		"ruleIds",
		"description",
		"matchedZones",
		"method",
		"requestUuid",
		"remediationComponentIp",
		"data",
	] as const),
} satisfies EvidenceRenderer<"appsec">;

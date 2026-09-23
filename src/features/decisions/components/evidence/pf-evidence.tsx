import { formatTime } from "@/common/lib/dates";
import { groupPfEvents } from "./pf-groups";
import {
	Chips,
	EventList,
	type EvidenceProps,
	type EvidenceRenderer,
	Labeled,
	Line,
} from "./shared";

/**
 * OPNsense pf evidence. The ports are the alert's `entries`; the events
 * carry the interface, protocol and rule that dropped them, folded into one
 * line per distinct combination with a count and its time span.
 */
function PfEvidence({ alert, events }: EvidenceProps<"opnsense-pf">) {
	const groups = groupPfEvents(events);

	return (
		<div className="space-y-2 text-xs">
			{alert.entryType === "ports" && (
				<Chips label="Ports probed" values={alert.entries} />
			)}
			{groups.length > 0 && (
				<EventList label={`Connections (${events.length})`}>
					{groups.map(({ key, fields, count, first, last }) => (
						<Line
							key={key}
							tag={fields.action ?? "?"}
							trailing={
								<>
									<span className="text-muted-foreground">×{count}</span>
									{first && (
										<span className="tabular-nums text-muted-foreground">
											{formatTime(first)}
											{last && last.getTime() !== first.getTime()
												? ` – ${formatTime(last)}`
												: ""}
										</span>
									)}
								</>
							}
						>
							<p className="flex flex-wrap gap-x-3 gap-y-0.5">
								<Labeled label="Interface">{fields.interface ?? "-"}</Labeled>
								<Labeled label="Protocol">{fields.protocol ?? "-"}</Labeled>
								<Labeled label="Rule">{fields.ruleNumber ?? "-"}</Labeled>
							</p>
							<p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
								{fields.machine && (
									<Labeled label="Firewall">{fields.machine}</Labeled>
								)}
								{fields.ruleId && (
									<Labeled label="Rule id">{fields.ruleId}</Labeled>
								)}
							</p>
						</Line>
					))}
				</EventList>
			)}
		</div>
	);
}

export const pfEvidence = {
	Component: PfEvidence,
	shownFields: new Set([
		"action",
		"interface",
		"protocol",
		"ruleNumber",
		"ruleId",
		"machine",
	] as const),
} satisfies EvidenceRenderer<"opnsense-pf">;

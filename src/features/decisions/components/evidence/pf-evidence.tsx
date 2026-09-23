import { Chips, type EvidenceProps } from "./shared";

/**
 * OPNsense pf evidence. The ports are the alert's `entries`; individual pf
 * events only carry the interface and rule that dropped them, so the first
 * event stands in for all of them.
 */
export function PfEvidence({ alert, events }: EvidenceProps) {
	const first = events[0];
	const fields =
		first?.fields.kind === "opnsense-pf" ? first.fields : undefined;
	const count = alert.eventsCount;

	return (
		<div className="space-y-1.5 text-xs">
			<p className="text-muted-foreground">
				{count} {fields?.action === "pass" ? "passed" : "dropped"} connection
				{count === 1 ? "" : "s"}
				{fields?.machine && ` · ${fields.machine}`}
				{fields?.interface && ` · ${fields.interface}`}
				{fields?.protocol && ` · ${fields.protocol}`}
				{fields?.ruleNumber && ` · rule ${fields.ruleNumber}`}
				{fields?.ruleId && (
					<span title={`Rule id ${fields.ruleId}`}>
						{" "}
						({fields.ruleId.slice(0, 8)})
					</span>
				)}
			</p>
			<Chips values={alert.entries} />
		</div>
	);
}

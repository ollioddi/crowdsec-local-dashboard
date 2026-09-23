import { EventList, type EvidenceProps, ExtraMeta } from "./shared";

/**
 * Fallback for a datasource no integration claims yet. Renders the raw meta
 * rather than an empty box, so an unrecognised source is visibly unparsed
 * instead of silently missing.
 */
export function UnknownEvidence({ events }: EvidenceProps) {
	if (events.length === 0) return null;

	return (
		<EventList>
			{events.map((event) => (
				<div key={event.id} className="py-0.5">
					<ExtraMeta values={event.unparsed} label="Raw event meta" />
				</div>
			))}
		</EventList>
	);
}

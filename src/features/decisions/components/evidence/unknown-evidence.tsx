import {
	EventList,
	type EvidenceProps,
	type EvidenceRenderer,
	FieldGrid,
} from "./shared";

/**
 * Fallback for a datasource no integration claims yet. Renders the raw meta
 * rather than an empty box, so an unrecognised source is visibly unparsed
 * instead of silently missing.
 */
function UnknownEvidence({ events }: EvidenceProps<"unknown">) {
	if (events.length === 0) return null;

	return (
		<EventList label={`Unparsed events (${events.length})`}>
			{events.map((event) => (
				<div key={event.id} className="px-2 py-1.5">
					<FieldGrid values={event.unparsed} />
				</div>
			))}
		</EventList>
	);
}

export const unknownEvidence = {
	Component: UnknownEvidence,
	shownFields: new Set([]),
} satisfies EvidenceRenderer<"unknown">;

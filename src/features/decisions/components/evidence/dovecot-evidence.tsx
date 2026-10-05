import { formatTime } from "@/common/lib/dates";
import type { DovecotAggregates } from "@/common/parsing/types";
import {
	ChipRow,
	EventList,
	type EvidenceProps,
	type EvidenceRenderer,
	Line,
	Lines,
	SummaryGrid,
} from "./shared";

const NO_AGGREGATES: DovecotAggregates = { kind: "dovecot" };

/**
 * Dovecot evidence: the mailboxes, protocols and reasons from the alert
 * context, then one authentication result per retained event.
 */
function DovecotEvidence({ alert, events }: EvidenceProps<"dovecot">) {
	const aggregates =
		alert.aggregates.kind === "dovecot" ? alert.aggregates : NO_AGGREGATES;
	const failures = events.filter(
		(event) => event.fields.loginResult === "auth_failed",
	).length;

	return (
		<div className="space-y-2 text-xs">
			{failures > 0 && (
				<p>
					Dovecot recorded {failures} failed login event
					{failures === 1 ? "" : "s"} in this alert.
				</p>
			)}
			<SummaryGrid
				rows={[
					{
						label: "Attempted mailboxes",
						value: (
							<ChipRow
								values={aggregates.mailboxes ?? []}
								emptyLabel="Not recorded"
							/>
						),
					},
					{
						label: "Protocols",
						value: (
							<Lines values={aggregates.protocols} emptyLabel="Not recorded" />
						),
					},
					{
						label: "Reasons",
						value: (
							<Lines
								values={aggregates.loginMessages}
								emptyLabel="Not recorded"
							/>
						),
					},
				]}
			/>
			<p className="text-muted-foreground">
				These details apply to the whole alert and are not linked to individual
				attempts.
			</p>
			{events.length > 0 && (
				<EventList label={`Mail authentication (${events.length})`}>
					{events.map((event) => {
						const { loginResult } = event.fields;
						const result =
							loginResult === "auth_failed" ? "Login failed" : loginResult;

						return (
							<Line
								key={event.id}
								tag={result}
								trailing={
									event.timestamp && (
										<span className="tabular-nums text-muted-foreground">
											{formatTime(event.timestamp)}
										</span>
									)
								}
							/>
						);
					})}
				</EventList>
			)}
		</div>
	);
}

export const dovecotEvidence = {
	Component: DovecotEvidence,
	shownFields: new Set(["loginResult"] as const),
} satisfies EvidenceRenderer<"dovecot">;

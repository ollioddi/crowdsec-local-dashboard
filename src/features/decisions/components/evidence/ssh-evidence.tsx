import { formatTime } from "@/common/lib/dates";
import {
	Chips,
	EventList,
	type EvidenceProps,
	type EvidenceRenderer,
	Labeled,
	Line,
} from "./shared";

/**
 * sshd evidence: the usernames the scenario counted, as chips, then one line
 * per attempt LAPI kept, with its service and time.
 */
function SshEvidence({ alert, events }: EvidenceProps<"ssh">) {
	return (
		<div className="space-y-2 text-xs">
			<Chips label="Usernames tried" values={alert.entries} />
			{events.length > 0 && (
				<EventList label={`Login attempts (${events.length})`}>
					{events.map((event) => (
						<Line
							key={event.id}
							trailing={
								event.timestamp && (
									<span className="tabular-nums text-muted-foreground">
										{formatTime(event.timestamp)}
									</span>
								)
							}
						>
							<p className="flex flex-wrap gap-x-3 gap-y-0.5">
								<Labeled label="User">{event.fields.user ?? "-"}</Labeled>
								<Labeled label="Service">{event.fields.service ?? "-"}</Labeled>
							</p>
						</Line>
					))}
				</EventList>
			)}
		</div>
	);
}

export const sshEvidence = {
	Component: SshEvidence,
	shownFields: new Set(["user", "service"] as const),
} satisfies EvidenceRenderer<"ssh">;

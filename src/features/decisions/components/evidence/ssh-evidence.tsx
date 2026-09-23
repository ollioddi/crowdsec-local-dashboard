import { Chips, type EvidenceProps } from "./shared";

/** sshd evidence: the usernames that were tried, and the service that saw them. */
export function SshEvidence({ alert, events }: EvidenceProps) {
	const first = events[0];
	const service =
		first?.fields.kind === "ssh" ? first.fields.service : undefined;

	return (
		<div className="space-y-1.5 text-xs">
			{service && <p className="text-muted-foreground">service: {service}</p>}
			<Chips values={alert.entries} />
		</div>
	);
}

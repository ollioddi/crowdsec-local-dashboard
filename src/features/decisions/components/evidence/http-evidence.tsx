import { EventList, type EvidenceProps } from "./shared";

function verbColor(verb: string | undefined): string {
	switch (verb?.toUpperCase()) {
		case "GET":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		case "POST":
			return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
		case "PUT":
			return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
		case "DELETE":
			return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
		case "PATCH":
			return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
		default:
			return "bg-muted text-muted-foreground";
	}
}

function statusColor(status: number | undefined): string {
	if (!status) return "text-muted-foreground";
	if (status < 300) return "text-green-600 dark:text-green-400";
	if (status < 400) return "text-blue-600 dark:text-blue-400";
	if (status < 500) return "text-amber-600 dark:text-amber-400";
	return "text-red-600 dark:text-red-400";
}

/**
 * Traefik access-log evidence: one line per request, verb, path, status.
 *
 * The hostname is shown next to the path only when an alert spans several, so
 * a single-target scan stays quiet; the router that served it rides along in
 * the tooltip, because "asked for backup.example.com, answered by
 * error-pages-router" is the whole story of a probe against a dead name.
 */
export function HttpEvidence({ events }: EvidenceProps) {
	if (events.length === 0) return null;

	const hosts = new Set(
		events.map((e) => e.facets.target?.fqdn).filter((v) => v !== undefined),
	);
	const showHost = hosts.size > 1;

	return (
		<EventList>
			{events.map((event) => {
				if (event.fields.kind !== "traefik-http") return null;
				const { verb, path, status, routerName, argsLength, authUser } =
					event.fields;
				const fqdn = event.facets.target?.fqdn;
				return (
					<div
						key={event.id}
						className="flex items-center gap-2 py-0.5 text-xs"
					>
						{verb && (
							<span
								className={`shrink-0 rounded px-1 py-0.5 font-mono text-[10px] font-bold ${verbColor(verb)}`}
							>
								{verb}
							</span>
						)}
						{showHost && fqdn && (
							<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
								{fqdn}
							</span>
						)}
						<span
							className="flex-1 truncate font-mono"
							title={[
								fqdn && `Host: ${fqdn}`,
								path,
								routerName && `Router: ${routerName}`,
								argsLength ? `Query string: ${argsLength} bytes` : undefined,
								authUser && `Auth user: ${authUser}`,
								event.timestamp && new Date(event.timestamp).toISOString(),
							]
								.filter(Boolean)
								.join("\n")}
						>
							{path ?? "-"}
						</span>
						{authUser && (
							<span
								className="shrink-0 font-mono text-[10px] text-muted-foreground"
								title="Authenticated user on the request"
							>
								{authUser}
							</span>
						)}
						{status !== undefined && (
							<span className={`shrink-0 font-mono ${statusColor(status)}`}>
								{status}
							</span>
						)}
					</div>
				);
			})}
		</EventList>
	);
}

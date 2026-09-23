import { formatTime } from "@/common/lib/dates";
import type { HttpEventFields } from "@/common/parsing/types";
import {
	EventList,
	type EventOf,
	type EvidenceProps,
	type EvidenceRenderer,
	Labeled,
	Line,
} from "./shared";

const VERB_COLORS: Record<string, string> = {
	GET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	POST: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
	PUT: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
	DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
	PATCH:
		"bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function verbColor(verb: string | undefined): string {
	return (
		VERB_COLORS[verb?.toUpperCase() ?? ""] ?? "bg-muted text-muted-foreground"
	);
}

function statusColor(status: number | undefined): string {
	if (!status) return "text-muted-foreground";
	if (status < 300) return "text-green-600 dark:text-green-400";
	if (status < 400) return "text-blue-600 dark:text-blue-400";
	if (status < 500) return "text-amber-600 dark:text-amber-400";
	return "text-red-600 dark:text-red-400";
}

/** The labelled second row: everything about the request but the path. */
function RequestDetails({
	fields,
	time,
}: Readonly<{ fields: HttpEventFields; time?: string }>) {
	const { routerName, authUser, argsLength, userAgent } = fields;
	if (!routerName && !authUser && !argsLength && !userAgent) return null;
	return (
		<p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
			{routerName && <Labeled label="Router">{routerName}</Labeled>}
			{authUser && <Labeled label="User">{authUser}</Labeled>}
			{argsLength ? <Labeled label="Query">{argsLength} B</Labeled> : null}
			{userAgent && (
				<span className="flex min-w-0 basis-full flex-col md:flex-row md:gap-1">
					<span className="flex shrink-0 items-baseline justify-between gap-2 text-muted-foreground">
						<span>User agent</span>
						{time && (
							<span className="text-xs tabular-nums md:hidden">{time}</span>
						)}
					</span>
					<span className="min-w-0 wrap-anywhere">{userAgent}</span>
				</span>
			)}
		</p>
	);
}

function RequestLine({ event }: Readonly<{ event: EventOf<"traefik-http"> }>) {
	const { fields } = event;
	const fqdn = event.facets.target?.fqdn;
	const time = event.timestamp ? formatTime(event.timestamp) : undefined;
	return (
		<Line
			tag={fields.verb}
			tagClassName={verbColor(fields.verb)}
			details={<RequestDetails fields={fields} time={time} />}
			trailing={
				<>
					{fields.status !== undefined && (
						<span className={`tabular-nums ${statusColor(fields.status)}`}>
							{fields.status}
						</span>
					)}
					{time && (
						<span
							className={`tabular-nums text-muted-foreground ${fields.userAgent ? "hidden md:inline" : ""}`}
						>
							{time}
						</span>
					)}
				</>
			}
		>
			<p className="break-all">
				{fqdn && <span className="text-muted-foreground">{fqdn}</span>}
				{fields.path ?? "-"}
			</p>
		</Line>
	);
}

/**
 * Traefik access-log evidence, one line per request. Every line has the same
 * shape: verb, host and path, status and time; then a labelled row with the
 * router, user agent, auth user and query size. Nothing is hoisted or hidden
 * based on what other lines contain.
 */
function HttpEvidence({ events }: EvidenceProps<"traefik-http">) {
	if (events.length === 0) return null;
	return (
		<EventList label={`Requests (${events.length})`}>
			{events.map((event) => (
				<RequestLine key={event.id} event={event} />
			))}
		</EventList>
	);
}

export const httpEvidence = {
	Component: HttpEvidence,
	shownFields: new Set([
		"verb",
		"path",
		"status",
		"userAgent",
		"routerName",
		"argsLength",
		"authUser",
	] as const),
} satisfies EvidenceRenderer<"traefik-http">;

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Info, Loader2, Trash2 } from "lucide-react";
import moment from "moment";
import type { ReactNode } from "react";
import type { DataTableRow } from "@/common/components/data-table/table-features";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Skeleton } from "@/common/components/ui/skeleton";
import { countryFlag, countryName } from "@/common/lib/country-flag";
import {
	type DecisionAlertDetail,
	getDecisionAlertsFn,
} from "@/features/decisions/api/decisions.functions";
import type { DecisionWithHost } from "@/features/decisions/api/decisions.types";
import { shortScenario } from "./columns";

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

function Field({
	label,
	children,
}: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className="min-w-0">
			<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<span className="break-words text-sm">{children}</span>
		</div>
	);
}

/** Rounds to the unit the value was almost certainly expressed in. */
function formatSpan(ms: number): string {
	const seconds = Math.round(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.round(ms / 60_000);
	if (minutes % 1440 === 0) return `${minutes / 1440}d`;
	if (minutes % 60 === 0) return `${minutes / 60}h`;
	const hours = Math.floor(minutes / 60);
	return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/** Whole units in words, since a configured ban is read, not scanned. */
function humanSpan(ms: number): string {
	const plural = (n: number, unit: string) =>
		`${n} ${unit}${n === 1 ? "" : "s"}`;
	const minutes = Math.round(ms / 60_000);
	if (minutes % 1440 === 0) return plural(minutes / 1440, "day");
	if (minutes % 60 === 0) return plural(minutes / 60, "hour");
	if (minutes < 60) return plural(minutes, "minute");
	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * LAPI only ever reports time remaining, on both the stream and the alerts
 * endpoint, so the decided length is the span from the triggering alert to the
 * expiry. Unknowable for a decision with no linked alert.
 */
function banLength(
	decision: DecisionWithHost,
	alerts: DecisionAlertDetail[],
): string | null {
	if (!decision.expiresAt || alerts.length === 0) return null;
	const start = Math.min(
		...alerts.map((alert) => new Date(alert.createdAt).getTime()),
	);
	const ms = new Date(decision.expiresAt).getTime() - start;
	return ms > 0 ? humanSpan(ms) : null;
}

/** How long the attack ran: burst scanner versus slow crawler. */
function attackSpan(alert: DecisionAlertDetail): string | null {
	if (!alert.startAt || !alert.stopAt) return null;
	const start = moment(alert.startAt);
	const stop = moment(alert.stopAt);
	if (!start.isValid() || !stop.isValid()) return null;
	const ms = stop.diff(start);
	if (ms < 0) return null;
	if (ms < 1000) return "in under a second";
	return `over ${formatSpan(ms)}`;
}

/** User agents behind an alert. */
function userAgents(alert: DecisionAlertDetail): string[] {
	const seen = new Set<string>();
	for (const event of alert.events) {
		if (event.eventType === "http" && event.httpUserAgent) {
			seen.add(event.httpUserAgent);
		}
	}
	return [...seen];
}

function AlertEvidence({ alert }: Readonly<{ alert: DecisionAlertDetail }>) {
	const firstEvent = alert.events[0];
	const agents = userAgents(alert);
	const span = attackSpan(alert);
	// LAPI's own count can exceed the events it actually returned
	const count = alert.eventsCount ?? alert.events.length;

	return (
		<div
			data-slot="alert-evidence"
			className="space-y-2 rounded-lg border bg-muted/20 p-2.5"
		>
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span className="text-xs font-semibold">
					{shortScenario(alert.scenario)}
				</span>
				<span className="text-xs text-muted-foreground">
					{count} event{count === 1 ? "" : "s"}
					{span && ` ${span}`}
					{" · "}
					{moment(alert.createdAt).format("DD/MM HH:mm")}
				</span>
			</div>

			{alert.entryType === "paths" && (
				<div className="max-h-48 space-y-0.5 overflow-y-auto overscroll-contain rounded border bg-background p-1">
					{alert.events
						.filter((e) => e.eventType === "http")
						.map((event, idx) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: events carry no stable id and the list is never reordered
								key={`${idx}-${event.httpVerb}${event.httpPath}${event.httpStatus}`}
								className="flex items-center gap-2 py-0.5 text-xs"
							>
								{event.httpVerb && (
									<span
										className={`shrink-0 rounded px-1 py-0.5 font-mono text-[10px] font-bold ${verbColor(event.httpVerb)}`}
									>
										{event.httpVerb}
									</span>
								)}
								<span
									className="flex-1 truncate font-mono"
									title={event.httpPath}
								>
									{event.httpPath ?? "—"}
								</span>
								{event.httpStatus && (
									<span
										className={`shrink-0 font-mono ${statusColor(event.httpStatus)}`}
									>
										{event.httpStatus}
									</span>
								)}
							</div>
						))}
				</div>
			)}

			{alert.entryType === "ports" && (
				<div className="space-y-1.5 text-xs">
					<p className="text-muted-foreground">
						{count} dropped connection{count === 1 ? "" : "s"}
						{firstEvent?.eventType === "firewall_pf" && (
							<>
								{firstEvent.pfMachine && ` · ${firstEvent.pfMachine}`}
								{firstEvent.pfInterface && ` · ${firstEvent.pfInterface}`}
								{firstEvent.pfRuleNumber &&
									` · rule ${firstEvent.pfRuleNumber}`}
							</>
						)}
					</p>
					{alert.entries.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{alert.entries.map((port) => (
								<span
									key={port}
									className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]"
								>
									{port}
								</span>
							))}
						</div>
					)}
				</div>
			)}

			{alert.entryType === "usernames" && alert.entries.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{alert.entries.map((user) => (
						<span
							key={user}
							className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]"
						>
							{user}
						</span>
					))}
				</div>
			)}

			{agents.length > 0 && (
				<p
					className="truncate font-mono text-[11px] text-muted-foreground"
					title={agents.join("\n")}
				>
					UA: {agents[0]}
					{agents.length > 1 && ` +${agents.length - 1} more`}
				</p>
			)}
		</div>
	);
}

/** Blank space does not explain why there is no evidence. */
function NoEvidence() {
	return (
		<p className="flex items-start gap-2 rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
			<Info className="mt-0.5 size-3.5 shrink-0" />
			<span>
				No alert evidence stored for this decision. CrowdSec keeps the
				triggering log lines only for a limited window, and decisions from
				blocklists or <code className="font-mono">cscli</code> never have any.
			</span>
		</p>
	);
}

interface DecisionExpandedRowProps {
	row: DataTableRow<DecisionWithHost>;
	onRequestDelete: (decision: DecisionWithHost) => void;
	deletingId: number | undefined;
}

export function DecisionExpandedRow({
	row,
	onRequestDelete,
	deletingId,
}: Readonly<DecisionExpandedRowProps>) {
	const decision = row.original;
	const host = decision.host;
	const isDeleting = deletingId === decision.id;

	const { data: alerts = [], isLoading } = useQuery({
		queryKey: ["decision-alerts", decision.id],
		queryFn: () => getDecisionAlertsFn({ data: { decisionId: decision.id } }),
		enabled: (decision.alertCount ?? 0) > 0,
		staleTime: Infinity,
	});

	const length = banLength(decision, alerts);

	return (
		<div className="relative space-y-3">
			{isDeleting && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
					<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						<span>Removing decision…</span>
					</div>
				</div>
			)}

			{/* Evidence first: it is the reason the row was expanded */}
			{isLoading ? (
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : alerts.length > 0 ? (
				<div className="space-y-2">
					{alerts.map((alert) => (
						<AlertEvidence key={alert.id} alert={alert} />
					))}
				</div>
			) : (
				<NoEvidence />
			)}

			{/* Only what the row or card does not already show */}
			<div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-[repeat(4,auto)] sm:justify-between">
				<Field label="Location">
					{host.country
						? `${countryFlag(host.country)} ${countryName(host.country)}`
						: "—"}
				</Field>
				<Field label="Network">
					{host.asName ?? "—"}
					{host.asNumber && (
						<span className="whitespace-nowrap text-muted-foreground">
							{" · "}AS{host.asNumber}
						</span>
					)}
				</Field>
				<Field label="First seen">
					{moment(decision.createdAt).format("DD/MM/YYYY HH:mm")}
				</Field>
				<Field label="Ban duration">
					<span className="flex items-center gap-1.5">
						<span
							title={
								length === null
									? "No linked alert, so the decided length is unknown"
									: undefined
							}
						>
							{length ?? "—"}
						</span>
						<Badge variant="outline" className="px-1 py-0 text-[10px]">
							{decision.origin}
						</Badge>
					</span>
				</Field>
			</div>

			<div className="flex gap-2">
				{decision.active && (
					<Button
						variant="destructive"
						size="sm"
						className="h-10 flex-1 sm:h-8 sm:flex-none"
						icon={Trash2}
						iconPlacement="left"
						loading={isDeleting}
						onClick={() => onRequestDelete(decision)}
					>
						Remove decision
					</Button>
				)}
				<Button
					variant="outline"
					size="sm"
					className="h-10 flex-1 sm:h-8 sm:flex-none"
					asChild
				>
					<a
						href={`https://app.crowdsec.net/cti/${decision.hostIp}`}
						target="_blank"
						rel="noreferrer"
					>
						<ExternalLink className="mr-1.5 size-4" />
						CrowdSec CTI
					</a>
				</Button>
			</div>
		</div>
	);
}

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import moment from "moment";
import type { ReactNode } from "react";
import type { DataTableRow } from "@/common/components/data-table/table-features";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Skeleton } from "@/common/components/ui/skeleton";
import { countryFlag } from "@/common/lib/country-flag";
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
			<p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<span className="break-all text-sm">{children}</span>
		</div>
	);
}

function AlertEvidence({ alert }: Readonly<{ alert: DecisionAlertDetail }>) {
	const firstEvent = alert.events[0];

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<span className="text-xs font-semibold">
					{shortScenario(alert.scenario)}
				</span>
				<span className="text-xs text-muted-foreground">
					· {alert.events.length} event{alert.events.length === 1 ? "" : "s"}
				</span>
			</div>

			{alert.entryType === "paths" && alert.entries.length > 0 && (
				<div className="max-h-48 space-y-0.5 overflow-y-auto rounded border p-1">
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
				<div className="space-y-1.5 rounded border p-2 text-xs">
					<p className="font-medium text-muted-foreground">
						{alert.events.length} dropped connection
						{alert.events.length === 1 ? "" : "s"}
						{firstEvent?.eventType === "firewall_pf" &&
							firstEvent.pfMachine &&
							` · ${firstEvent.pfMachine}`}
					</p>
					{alert.entries.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{alert.entries.map((port) => (
								<span
									key={port}
									className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]"
								>
									{port}
								</span>
							))}
						</div>
					)}
				</div>
			)}

			{alert.entryType === "usernames" && alert.entries.length > 0 && (
				<div className="max-h-32 space-y-0.5 overflow-y-auto rounded border p-1">
					{alert.entries.map((user) => (
						<div
							key={user}
							className="flex items-center gap-2 px-1 py-0.5 text-xs"
						>
							<span className="font-mono">{user}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

interface DecisionExpandedRowProps {
	row: DataTableRow<DecisionWithHost>;
	onDelete: (id: number, collapse?: () => void) => void;
	deletingId: number | undefined;
}

export function DecisionExpandedRow({
	row,
	onDelete,
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

	return (
		<div className="relative space-y-4 px-1 py-2">
			{isDeleting && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
					<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						<span>Deleting decision…</span>
					</div>
				</div>
			)}

			<div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
				<Field label="Location">
					{host.country ? `${countryFlag(host.country)} ${host.country}` : "—"}
				</Field>
				<Field label="AS name">{host.asName ?? "—"}</Field>
				<Field label="AS number">{host.asNumber ?? "—"}</Field>
				<Field label="Created">
					{moment(decision.createdAt).format("DD/MM/YYYY HH:mm")}
				</Field>
			</div>

			<div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
				<Field label="Scenario">{decision.scenario}</Field>
				<Field label="Origin">
					<Badge variant="outline">{decision.origin}</Badge>
				</Field>
				<Field label="Duration">{decision.duration}</Field>
				<Field label="Expires">
					{decision.expiresAt
						? moment(decision.expiresAt).format("DD/MM/YYYY HH:mm")
						: "—"}
				</Field>
			</div>

			{(decision.alertCount ?? 0) > 0 && (
				<div className="space-y-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Alert evidence
					</p>
					{isLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-16 w-full" />
						</div>
					) : (
						alerts.map((alert) => (
							<AlertEvidence key={alert.id} alert={alert} />
						))
					)}
				</div>
			)}

			<div className="flex gap-2">
				{decision.active && (
					<Button
						variant="destructive"
						size="sm"
						className="flex-1 sm:flex-none"
						icon={Trash2}
						iconPlacement="left"
						loading={isDeleting}
						onClick={() =>
							onDelete(decision.id, () => row.toggleExpanded(false))
						}
					>
						{isDeleting ? "Deleting…" : "Delete decision"}
					</Button>
				)}
				<Button
					variant="outline"
					size="sm"
					className="flex-1 sm:flex-none"
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

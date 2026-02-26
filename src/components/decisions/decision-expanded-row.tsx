import { useQuery } from "@tanstack/react-query";
import type { Row } from "@tanstack/react-table";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { RelativeTime } from "@/components/relative-dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type DecisionAlertDetail,
	type DecisionWithHost,
	getDecisionAlertsFn,
} from "@/lib/decisions.functions";

function originVariant(origin: string) {
	switch (origin.toLowerCase()) {
		case "cscli":
			return "outline" as const;
		case "capi":
			return "secondary" as const;
		default:
			return "default" as const;
	}
}

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

interface AlertEvidenceProps {
	alert: DecisionAlertDetail;
}

function AlertEvidence({ alert }: Readonly<AlertEvidenceProps>) {
	const firstEvent = alert.events[0];

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<span className="text-xs font-semibold">
					{alert.scenario
						.replace("crowdsecurity/", "")
						.replace("firewallservices/", "")}
				</span>
				<span className="text-xs text-muted-foreground">
					· {alert.events.length} event{alert.events.length === 1 ? "" : "s"}
				</span>
			</div>

			{alert.entryType === "paths" && alert.entries.length > 0 && (
				<div className="max-h-48 overflow-y-auto space-y-0.5 rounded border p-1">
					{alert.events
						.filter((e) => e.eventType === "http")
						.map((event, idx) => (
							<div
								key={`${idx}-${event.httpVerb}${event.httpPath}${event.httpStatus}`}
								className="flex items-center gap-2 text-xs py-0.5"
							>
								{event.httpVerb && (
									<span
										className={`shrink-0 rounded px-1 py-0.5 font-mono text-[10px] font-bold ${verbColor(event.httpVerb)}`}
									>
										{event.httpVerb}
									</span>
								)}
								<span
									className="font-mono flex-1 truncate"
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
				<div className="rounded border p-2 text-xs space-y-1.5">
					<p className="text-muted-foreground font-medium">
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
									className="font-mono rounded bg-muted px-1.5 py-0.5 text-[11px]"
								>
									{port}
								</span>
							))}
						</div>
					)}
				</div>
			)}

			{alert.entryType === "usernames" && alert.entries.length > 0 && (
				<div className="max-h-32 overflow-y-auto space-y-0.5 rounded border p-1">
					{alert.entries.map((user) => (
						<div
							key={user}
							className="flex items-center gap-2 text-xs py-0.5 px-1"
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
	row: Row<DecisionWithHost>;
	onDelete: (id: number, collapse?: () => void) => void;
	deletingId: number | undefined;
}

export function DecisionExpandedRow({
	row,
	onDelete,
	deletingId,
}: Readonly<DecisionExpandedRowProps>) {
	const decision = row.original;
	const isDeleting = deletingId === decision.id;

	const { data: alerts = [], isLoading } = useQuery({
		queryKey: ["decision-alerts", decision.id],
		queryFn: () => getDecisionAlertsFn({ data: { decisionId: decision.id } }),
		enabled: decision.alerts.length > 0,
		staleTime: Infinity,
	});

	return (
		<div className="relative px-1 py-2 space-y-4">
			{isDeleting && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
					<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						<span>Deleting decision…</span>
					</div>
				</div>
			)}
			<div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
				<div className="col-span-2">
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Scenario
					</p>
					<span className="font-medium break-all">
						{decision.scenario.replace("crowdsecurity/", "")}
					</span>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Origin
					</p>
					<Badge variant={originVariant(decision.origin)}>
						{decision.origin}
					</Badge>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Country
					</p>
					<span>{decision.host.country ?? "—"}</span>
				</div>
				{decision.host.asNumber && (
					<div className="col-span-2">
						<p className="text-xs font-medium text-muted-foreground mb-0.5">
							AS
						</p>
						<span>
							{decision.host.asNumber}
							{decision.host.asName && ` — ${decision.host.asName}`}
						</span>
					</div>
				)}
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Duration
					</p>
					<span>{decision.duration}</span>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Expires
					</p>
					<RelativeTime date={decision.expiresAt} />
				</div>
			</div>

			{decision.alerts.length > 0 && (
				<div className="space-y-3">
					<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Alert Evidence
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
						className="flex-1"
						disabled={isDeleting}
						onClick={() =>
							onDelete(decision.id, () => row.toggleExpanded(false))
						}
					>
						{isDeleting ? (
							<Loader2 className="mr-1.5 size-4 animate-spin" />
						) : (
							<Trash2 className="mr-1.5 size-4" />
						)}
						{isDeleting ? "Deleting…" : "Delete"}
					</Button>
				)}
				<Button
					variant="default"
					size="sm"
					className="flex-1"
					onClick={() =>
						window.open(
							`https://app.crowdsec.net/cti/${decision.hostIp}`,
							"_blank",
						)
					}
				>
					<ExternalLink className="mr-1.5 size-4" />
					CrowdSec CTI
				</Button>
			</div>
		</div>
	);
}

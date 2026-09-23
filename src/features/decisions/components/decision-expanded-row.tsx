import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { DataTableRow } from "@/common/components/data-table/table-features";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Skeleton } from "@/common/components/ui/skeleton";
import { countryFlag, countryName } from "@/common/lib/country-flag";
import { formatDateTime, humanSpan } from "@/common/lib/dates";
import type { AlertDetail } from "@/features/decisions/api/alert-detail";
import { getDecisionAlertsFn } from "@/features/decisions/api/decisions.functions";
import type { DecisionWithHost } from "@/features/decisions/api/decisions.types";
import { AlertEvidence, NoEvidence } from "./evidence/alert-evidence";

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

/**
 * LAPI only ever reports time remaining, on both the stream and the alerts
 * endpoint, so the decided length is the span from the triggering alert to the
 * expiry. Unknowable for a decision with no linked alert.
 */
function banLength(
	decision: DecisionWithHost,
	alerts: AlertDetail[],
): string | null {
	if (!decision.expiresAt || alerts.length === 0) return null;
	const start = Math.min(
		...alerts.map((alert) => new Date(alert.createdAt).getTime()),
	);
	const ms = new Date(decision.expiresAt).getTime() - start;
	return ms > 0 ? humanSpan(ms) : null;
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
						: "-"}
				</Field>
				<Field label="Network">
					{host.asName ?? "-"}
					{host.asNumber && (
						<span className="whitespace-nowrap text-muted-foreground">
							{" · "}AS{host.asNumber}
						</span>
					)}
				</Field>
				<Field label="First seen">{formatDateTime(decision.createdAt)}</Field>
				<Field label="Ban duration">
					<span className="flex items-center gap-1.5">
						<span
							title={
								length === null
									? "No linked alert, so the decided length is unknown"
									: `LAPI reported ${decision.duration} remaining at the last sync`
							}
						>
							{length ?? "-"}
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

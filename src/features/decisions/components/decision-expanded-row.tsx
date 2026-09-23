import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
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
import type {
	DecisionHost,
	DecisionWithHost,
} from "@/features/decisions/api/decisions.types";
import { AlertEvidence, NoEvidence } from "./evidence/alert-evidence";

function Fact({
	label,
	className,
	children,
}: Readonly<{ label: string; className?: string; children: ReactNode }>) {
	return (
		<div className={cn("min-w-0", className)}>
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="wrap-break-word text-sm">{children}</dd>
		</div>
	);
}

function Muted({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<span className="block text-xs text-muted-foreground">{children}</span>
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

function distinct(values: Array<string | null | undefined>): string[] {
	return [...new Set(values.filter((v): v is string => !!v))];
}

/**
 * What the alerts add to the host: EU membership and the announced range
 * from GeoIP enrichment, and which agent read which log. Missing until the
 * alerts load, and absent for decisions with none.
 */
function alertFacts(alerts: AlertDetail[]) {
	const events = alerts.flatMap((alert) => alert.events);
	const geo = events.map((event) => event.facets.geo);
	return {
		isoCode: distinct(geo.map((g) => g?.isoCode))[0],
		asnOrg: distinct(geo.map((g) => g?.asnOrg))[0],
		asnNumber: distinct(geo.map((g) => g?.asnNumber))[0],
		inEU: geo.some((g) => g?.isInEU === true),
		ranges: distinct([
			...alerts.map((alert) => alert.provenance.sourceRange),
			...geo.map((g) => g?.sourceRange),
		]),
		machines: distinct(alerts.map((alert) => alert.provenance.machineId)),
		datasources: distinct(events.map((event) => event.datasourcePath)),
		datasourceTypes: distinct(events.map((event) => event.datasourceType)),
	};
}

type AlertFacts = ReturnType<typeof alertFacts>;

/**
 * The network line and its detail. The host row is the primary source; the
 * alert's GeoIP facet fills in for a host the sync never enriched. AS0 is
 * what the enricher writes when it knows nothing, so it reads as unknown.
 */
function networkFacts(host: DecisionHost, facts: AlertFacts) {
	const asName = host.asName ?? facts.asnOrg;
	const asNumber = host.asNumber ?? facts.asnNumber;
	const as = asNumber && asNumber !== "0" ? `AS${asNumber}` : null;
	const name = asName ?? as ?? "Unknown";
	const detail = [asName ? as : null, ...facts.ranges].filter(Boolean);
	return { name, detail: detail.join(" · ") };
}

function useDecisionAlerts(decision: DecisionWithHost) {
	return useQuery({
		queryKey: ["decision-alerts", decision.id],
		queryFn: () => getDecisionAlertsFn({ data: { decisionId: decision.id } }),
		enabled: (decision.alertCount ?? 0) > 0,
		staleTime: Infinity,
	});
}

function EvidenceColumn({
	alerts,
	isLoading,
	hostIp,
}: Readonly<{ alerts: AlertDetail[]; isLoading: boolean; hostIp: string }>) {
	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-20 w-full" />
			</div>
		);
	}
	if (alerts.length === 0) return <NoEvidence />;
	return (
		<div className="divide-y">
			{alerts.map((alert) => (
				<div key={alert.id} className="py-3 first:pt-0 last:pb-0">
					<AlertEvidence alert={alert} hostIp={hostIp} />
				</div>
			))}
		</div>
	);
}

/** Six slots, always in this order; "Unknown" rather than a missing slot. */
function FactsList({
	decision,
	alerts,
}: Readonly<{ decision: DecisionWithHost; alerts: AlertDetail[] }>) {
	const facts = alertFacts(alerts);
	const country = decision.host.country ?? facts.isoCode;
	const network = networkFacts(decision.host, facts);
	const length = banLength(decision, alerts);
	return (
		<dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-1">
			<Fact label="Location">
				{country ? `${countryFlag(country)} ${countryName(country)}` : "-"}
				{facts.inEU && <span className="text-muted-foreground"> · EU</span>}
			</Fact>
			<Fact label="Network">
				{network.name}
				{network.detail && <Muted>{network.detail}</Muted>}
			</Fact>
			<Fact label="Agent">
				{facts.machines.length > 0 ? facts.machines.join(", ") : "Unknown"}
			</Fact>
			<Fact label="Log" className="col-span-2 md:col-span-1">
				<span className="break-all font-mono text-xs">
					{facts.datasources.length > 0
						? facts.datasources.join(", ")
						: "Unknown"}
				</span>
				{facts.datasourceTypes.length > 0 && (
					<Muted>{facts.datasourceTypes.join(", ")} datasource</Muted>
				)}
			</Fact>
			<Fact label="First seen">{formatDateTime(decision.createdAt)}</Fact>
			<Fact label="Ban length">
				<span className="flex items-center gap-1.5">
					<span>{length ?? "Unknown"}</span>
					<Badge variant="outline" className="h-5 px-1.5 text-[10px]">
						{decision.origin}
					</Badge>
				</span>
				{length === null && <Muted>No linked alert to date it from</Muted>}
			</Fact>
		</dl>
	);
}

function Actions({
	decision,
	isDeleting,
	onRequestDelete,
}: Readonly<{
	decision: DecisionWithHost;
	isDeleting: boolean;
	onRequestDelete: (decision: DecisionWithHost) => void;
}>) {
	return (
		<div className="flex gap-2">
			{decision.active && (
				<Button
					variant="destructive"
					size="sm"
					className="h-10 flex-1 md:h-8"
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
				className="h-10 flex-1 md:h-8"
				asChild
			>
				<a
					href={`https://app.crowdsec.net/cti/${decision.hostIp}`}
					target="_blank"
					rel="noreferrer"
				>
					<ExternalLink className="size-4" />
					CrowdSec CTI
				</a>
			</Button>
		</div>
	);
}

interface DecisionExpandedRowProps {
	row: DataTableRow<DecisionWithHost>;
	onRequestDelete: (decision: DecisionWithHost) => void;
	deletingId: number | undefined;
}

/**
 * Evidence on the left, facts on the right, actions under the facts. On a
 * phone the same blocks stack. Everything the row or card already says
 * (IP, decision type, scenario, expiry) stays out.
 */
export function DecisionExpandedRow({
	row,
	onRequestDelete,
	deletingId,
}: Readonly<DecisionExpandedRowProps>) {
	const decision = row.original;
	const isDeleting = deletingId === decision.id;
	const { data: alerts = [], isLoading } = useDecisionAlerts(decision);

	return (
		<div className="relative flex flex-col gap-4 md:flex-row md:gap-6">
			{isDeleting && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
					<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						<span>Removing decision…</span>
					</div>
				</div>
			)}

			{/* Evidence first: it is the reason the row was expanded */}
			<div className="min-w-0 flex-1">
				<EvidenceColumn
					alerts={alerts}
					isLoading={isLoading}
					hostIp={decision.hostIp}
				/>
			</div>

			<aside className="flex shrink-0 flex-col gap-3 md:w-80 md:border-l md:pl-5">
				<FactsList decision={decision} alerts={alerts} />
				<Actions
					decision={decision}
					isDeleting={isDeleting}
					onRequestDelete={onRequestDelete}
				/>
			</aside>
		</div>
	);
}

import { cn } from "cn";
import { ExternalLink, Trash2 } from "lucide-react";
import type { DataTableColumnDef } from "@/common/components/data-table/table-features";
import { IPLinkBadge } from "@/common/components/ip-badge";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { useRelativeTime } from "@/common/hooks/use-relative-time";
import { countryFlag, countryName } from "@/common/lib/country-flag";
import { formatDateTime } from "@/common/lib/dates";
import type { DecisionWithHost } from "@/features/decisions/api/decisions.types";

export function shortScenario(scenario: string) {
	return scenario.replace(/^(crowdsecurity|firewallservices)\//, "");
}

function typeVariant(type: string) {
	switch (type.toLowerCase()) {
		case "ban":
			return "destructive" as const;
		case "captcha":
			return "info" as const;
		default:
			return "outline" as const;
	}
}

/** Timestamp with the live countdown under it, matching RelativeTime. */
function ExpiresCell({ decision }: Readonly<{ decision: DecisionWithHost }>) {
	const relative = useRelativeTime(decision.expiresAt);
	const exact = decision.expiresAt ? formatDateTime(decision.expiresAt) : null;

	if (!decision.active) {
		return (
			<span className="flex flex-col leading-tight text-muted-foreground">
				<span className="text-sm">expired</span>
				{exact && <span className="text-xs">{exact}</span>}
			</span>
		);
	}

	// Still flagged active but already past its expiry: the sync has not caught up
	const overdue =
		decision.expiresAt !== null && new Date(decision.expiresAt) < new Date();

	return (
		<span className="flex flex-col leading-tight tabular-nums">
			<span className="text-sm">{exact ?? "-"}</span>
			<span
				className={cn(
					"text-xs text-muted-foreground",
					overdue && "text-amber-600 dark:text-amber-400",
				)}
			>
				{overdue ? `overdue · ${relative}` : relative}
			</span>
		</span>
	);
}

export function createColumns(
	onRequestDelete: (decision: DecisionWithHost) => void,
	deletingId: number | undefined,
): DataTableColumnDef<DecisionWithHost>[] {
	return [
		{
			accessorKey: "hostIp",
			header: "Host",
			meta: {
				sortable: true,
				filter: "text",
				globalFilter: true,
				card: "title",
			},
			cell: ({ row }) => (
				<span className="flex items-center gap-2">
					<span title={countryName(row.original.host.country) || undefined}>
						{countryFlag(row.original.host.country)}
					</span>
					<IPLinkBadge ip={row.original.hostIp} />
				</span>
			),
		},
		{
			accessorKey: "type",
			header: "Decision",
			size: 140,
			meta: { filter: "select", card: "badge" },
			cell: ({ row }) => {
				return (
					<span className="flex flex-wrap items-center gap-1">
						<Badge variant={typeVariant(row.original.type)}>
							{row.original.type}
						</Badge>
						{row.original.simulated && (
							<Badge
								variant="warning"
								title="CrowdSec reported this in simulation mode. Nothing is blocked."
							>
								simulated
							</Badge>
						)}
						{row.original.scope && row.original.scope !== "Ip" && (
							<Badge variant="outline">{row.original.scope}</Badge>
						)}
						{!row.original.active && <Badge variant="outline">expired</Badge>}
					</span>
				);
			},
		},
		{
			id: "status",
			accessorFn: (row) => (row.active ? "Active" : "Expired"),
			header: "Status",
			meta: { filterOnly: true, filter: "select", sortable: true },
		},
		{
			id: "enforcement",
			accessorFn: (row) => (row.simulated ? "Simulated" : "Enforced"),
			header: "Enforcement",
			meta: { filterOnly: true, filter: "select", sortable: true },
		},
		{
			id: "scope",
			accessorFn: (row) => row.scope ?? "Ip",
			header: "Scope",
			meta: { filterOnly: true, filter: "select" },
		},
		{
			accessorKey: "scenario",
			header: "Scenario",
			meta: { sortable: true, filter: "text", globalFilter: true },
			cell: ({ row }) => {
				const { scenario, origin } = row.original;
				const entryCount = row.original.entryCount ?? 0;
				return (
					<span className="flex min-w-0 flex-col leading-tight">
						<span className="truncate font-medium" title={scenario}>
							{shortScenario(scenario)}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							via {origin}
							{entryCount > 0 &&
								` · ${entryCount} entr${entryCount === 1 ? "y" : "ies"}`}
						</span>
					</span>
				);
			},
		},
		{
			accessorKey: "origin",
			header: "Origin",
			meta: { filterOnly: true, filter: "select" },
		},
		{
			id: "country",
			accessorFn: (row) => row.host.country ?? "",
			header: "Country",
			meta: { filterOnly: true, filter: "select", sortable: true },
		},
		{
			accessorKey: "expiresAt",
			header: "Expires",
			size: 130,
			meta: { sortable: true, filter: "date" },
			cell: ({ row }) => <ExpiresCell decision={row.original} />,
		},
		{
			accessorKey: "createdAt",
			header: "Created",
			meta: { filterOnly: true, filter: "date", sortable: true },
		},
		{
			id: "actions",
			size: 90,
			cell: ({ row }) => {
				const decision = row.original;
				return (
					<span className="flex items-center justify-end gap-1">
						{decision.active && (
							<Button
								variant="ghost"
								size="icon-sm"
								className="size-9 text-muted-foreground hover:text-destructive sm:size-8"
								aria-label={`Remove ${decision.type} on ${decision.hostIp}`}
								loading={deletingId === decision.id}
								onClick={() => onRequestDelete(decision)}
							>
								<Trash2 className="size-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon-sm"
							className="size-9 text-muted-foreground sm:size-8"
							asChild
						>
							<a
								href={`https://app.crowdsec.net/cti/${decision.hostIp}`}
								target="_blank"
								rel="noreferrer"
								aria-label={`View ${decision.hostIp} in CrowdSec CTI`}
							>
								<ExternalLink className="size-4" />
							</a>
						</Button>
					</span>
				);
			},
		},
	];
}

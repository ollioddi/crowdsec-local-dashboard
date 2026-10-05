import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import type { DataTableRow } from "@/common/components/data-table/table-features";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/common/components/ui/dialog";
import { Skeleton } from "@/common/components/ui/skeleton";
import { useOnline } from "@/common/hooks/use-online";
import { countryFlag, countryName } from "@/common/lib/country-flag";
import { formatDateTime, formatShortDateTime } from "@/common/lib/dates";
import { shortScenario } from "@/features/decisions/components/columns";
import type { HostActivity } from "@/features/hosts/api/host-activity";
import {
	getHostActivityFn,
	type HostWithCount,
} from "@/features/hosts/api/hosts.functions";

function historyLink(hostIp: string, scenario?: string) {
	return {
		to: "/decisions" as const,
		search: {
			filters: {
				hostIp: { operator: "equals" as const, value: hostIp },
				...(scenario
					? { scenario: { operator: "equals" as const, value: scenario } }
					: {}),
			},
		},
	};
}

function Section({
	title,
	detail,
	children,
}: Readonly<{ title: string; detail?: string; children: ReactNode }>) {
	return (
		<section className="min-w-0 space-y-2">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{title}
				</h3>
				{detail && (
					<span className="text-xs text-muted-foreground">{detail}</span>
				)}
			</div>
			{children}
		</section>
	);
}

function TargetValues({
	group,
}: Readonly<{ group: HostActivity["targets"][number] }>) {
	// Small sets are shown in full. Large sets get a separate, bounded browser;
	// opening one never stretches the expanded host row or its mobile drawer.
	const preview = group.values.slice(0, group.total <= 6 ? 6 : 3);
	return (
		<div className="space-y-1.5">
			<p className="text-xs font-medium">
				{group.label}
				<span className="ml-1.5 font-normal text-muted-foreground">
					{group.total}
				</span>
			</p>
			<Dialog>
				<div className="flex flex-wrap gap-1.5">
					{preview.map((item) => (
						<DialogTrigger key={item.value} asChild>
							<button
								type="button"
								title={`${item.value} · mentioned in ${item.alertCount} alerts`}
								className="inline-flex max-w-full items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
							>
								<span className="max-w-52 truncate font-mono">
									{item.value}
								</span>
								<span className="shrink-0 tabular-nums text-muted-foreground">
									×{item.alertCount}
								</span>
							</button>
						</DialogTrigger>
					))}
					{group.total > 6 && (
						<DialogTrigger asChild>
							<Button size="xs" variant="ghost" className="h-7">
								Browse {group.total}
							</Button>
						</DialogTrigger>
					)}
				</div>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{group.label}</DialogTitle>
						<DialogDescription>
							{group.total > group.values.length
								? `Top ${group.values.length} of ${group.total} distinct values. `
								: ""}
							Counts show stored alerts mentioning each value.
						</DialogDescription>
					</DialogHeader>
					<ul className="max-h-[min(24rem,55dvh)] overflow-y-auto overscroll-contain divide-y pr-2">
						{group.values.map((item) => (
							<li
								key={item.value}
								className="flex items-start justify-between gap-4 py-2 text-sm"
							>
								<span className="min-w-0 break-all font-mono">
									{item.value}
								</span>
								<span className="shrink-0 tabular-nums text-muted-foreground">
									×{item.alertCount}
								</span>
							</li>
						))}
					</ul>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function Targets({ targets }: Readonly<{ targets: HostActivity["targets"] }>) {
	return (
		<Section title="Observed targets" detail="Mentions per alert">
			{targets.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					No target details in the stored evidence.
				</p>
			) : (
				<div className="max-h-72 space-y-3 overflow-y-auto overscroll-contain pr-1">
					{targets.map((group) => (
						<TargetValues key={group.label} group={group} />
					))}
				</div>
			)}
		</Section>
	);
}

function Scenarios({
	activity,
	hostIp,
}: Readonly<{ activity: HostActivity; hostIp: string }>) {
	return (
		<Section
			title="Scenarios"
			detail={`${activity.alertCount} stored alerts · latest first`}
		>
			{activity.scenarios.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No stored activity for this host.
				</p>
			) : (
				<div className="max-h-72 overflow-y-auto overscroll-contain divide-y rounded-md border">
					{activity.scenarios.map((item) => (
						<Link
							key={item.scenario}
							{...historyLink(hostIp, item.scenario)}
							className="flex items-start justify-between gap-3 px-3 py-2 hover:bg-muted/50"
						>
							<div className="min-w-0 space-y-1">
								<p
									className="break-words text-sm font-medium"
									title={item.scenario}
								>
									{shortScenario(item.scenario)}
								</p>
								<p className="text-xs text-muted-foreground">
									{item.alertCount} {item.alertCount === 1 ? "alert" : "alerts"}{" "}
									· {item.decisionCount}{" "}
									{item.decisionCount === 1 ? "decision" : "decisions"}
								</p>
								<p className="break-words text-xs text-muted-foreground">
									{item.services.length
										? item.services.join(", ")
										: `via ${item.origins.join(", ")}`}
									{item.agents
										.filter(
											(agent) =>
												!item.services.some(
													(service) =>
														service.toLowerCase() === agent.toLowerCase(),
												),
										)
										.map((agent) => ` · ${agent}`)
										.join("")}
									{item.alertCount === 0 && " · no alert evidence"}
								</p>
							</div>
							<div className="shrink-0 space-y-1.5 text-right">
								<time
									title={`Latest occurrence: ${formatDateTime(item.latestAt)}`}
									className="text-xs tabular-nums text-muted-foreground"
								>
									{formatShortDateTime(item.latestAt)}
								</time>
								<div className="flex flex-col items-end gap-1">
									{item.activeCount > 0 && (
										<Badge
											variant="destructive"
											className="h-5 px-1.5 text-[10px]"
										>
											{item.activeCount} active
										</Badge>
									)}
									{item.simulatedCount > 0 && (
										<Badge variant="warning" className="h-5 px-1.5 text-[10px]">
											{item.simulatedCount} simulated
										</Badge>
									)}
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</Section>
	);
}

export function HostExpandedRow({
	row,
}: Readonly<{ row: DataTableRow<HostWithCount> }>) {
	const host = row.original;
	const query = useQuery({
		queryKey: ["host-activity", host.ip],
		queryFn: ({ signal }) =>
			getHostActivityFn({ data: { hostIp: host.ip }, signal }),
		staleTime: Infinity,
	});
	const online = useOnline();
	const activity = query.data;
	const country = host.country ?? activity?.network.country;
	const asNumber =
		host.asNumber && host.asNumber !== "0"
			? host.asNumber
			: activity?.network.asNumber;
	const asName = host.asName || activity?.network.asName;
	return (
		<div className="min-w-0 space-y-4 px-1 py-2">
			<div className="flex flex-wrap gap-x-5 gap-y-1 border-b pb-3 text-xs text-muted-foreground">
				<span>
					{country
						? `${countryFlag(country)} ${countryName(country)}`
						: "Unknown location"}
				</span>
				<span className="break-all">
					{asName ?? (asNumber ? `AS${asNumber}` : "Unknown network")}
					{asName && asNumber && ` · AS${asNumber}`}
				</span>
				{host.scope !== "Ip" && <span>Scope {host.scope}</span>}
				{activity && activity.network.ranges.length > 0 && (
					<span className="break-all" title="Source ranges">
						{activity.network.ranges.slice(0, 2).join(", ")}
						{activity.network.ranges.length > 2 &&
							` (+${activity.network.ranges.length - 2})`}
					</span>
				)}
			</div>
			{query.isLoading ? (
				<div className="grid gap-4 md:grid-cols-2">
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				!activity &&
				!query.isError && (
					<p className="flex items-center gap-2 text-xs text-muted-foreground">
						<WifiOff className="size-4" />
						Waiting for a connection to load host activity.
					</p>
				)
			)}
			{query.isError && (
				<div
					role="alert"
					className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground"
				>
					<WifiOff className="size-4" />
					{activity
						? "Could not refresh. Showing previously loaded history."
						: "Host activity could not be loaded."}
					{online && (
						<Button variant="outline" size="xs" onClick={() => query.refetch()}>
							Try again
						</Button>
					)}
				</div>
			)}
			{query.isFetching && activity && (
				<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Loader2 className="size-3 animate-spin" />
					Refreshing activity…
				</p>
			)}
			{activity && (
				<div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-6">
					<Scenarios activity={activity} hostIp={host.ip} />
					<Targets targets={activity.targets} />
				</div>
			)}
			<div className="flex flex-wrap items-center gap-2 border-t pt-3">
				{host._count.decisions > 0 && (
					<Button size="sm" asChild>
						<Link
							to="/decisions"
							search={{
								filters: {
									hostIp: { operator: "equals", value: host.ip },
									status: { operator: "isAnyOf", value: ["Active"] },
								},
							}}
						>
							View active decisions
						</Link>
					</Button>
				)}
				<Button size="sm" variant="outline" asChild>
					<Link {...historyLink(host.ip)}>View all decisions</Link>
				</Button>
				<Button size="sm" variant="ghost" asChild>
					<a
						href={`https://app.crowdsec.net/cti/${encodeURIComponent(host.ip)}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink className="mr-1.5 size-4" />
						CrowdSec CTI
					</a>
				</Button>
			</div>
		</div>
	);
}

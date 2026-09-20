import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { DataTableRow } from "@/common/components/data-table/table-features";
import { Button } from "@/common/components/ui/button";
import { countryFlag, countryName } from "@/common/lib/country-flag";
import type { HostWithCount } from "@/features/hosts/api/hosts.functions";
import { hostDecisions } from "./columns";

function Field({
	label,
	children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
	return (
		<div className="min-w-0">
			<p className="mb-0.5 text-xs font-medium text-muted-foreground">
				{label}
			</p>
			<span className="break-all">{children}</span>
		</div>
	);
}

export function HostExpandedRow({
	row,
}: Readonly<{ row: DataTableRow<HostWithCount> }>) {
	const host = row.original;
	const { label, link } = hostDecisions(host);

	return (
		<div className="space-y-4 px-1 py-2">
			<div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)]">
				<Field label="Country">
					{host.country
						? `${countryFlag(host.country)} ${countryName(host.country)}`
						: "—"}
				</Field>
				<Field label="AS number">{host.asNumber ?? "—"}</Field>
				<Field label="AS name">{host.asName ?? "—"}</Field>
				<Field label="Scope">{host.scope}</Field>
			</div>
			<Button size="sm" asChild className="w-full sm:w-auto">
				<Link {...link}>
					<ExternalLink className="mr-1.5 size-4" />
					{label}
				</Link>
			</Button>
		</div>
	);
}

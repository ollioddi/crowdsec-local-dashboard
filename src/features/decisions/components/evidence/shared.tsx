import type { ReactNode } from "react";
import type {
	AlertDetail,
	AlertDetailEvent,
} from "@/features/decisions/api/alert-detail";

/**
 * What every evidence renderer receives: the whole alert, plus only the
 * events its own integration claimed. Narrowing on `fields.kind` inside the
 * renderer is for the type system; the list is already its own.
 */
export type EvidenceProps = Readonly<{
	alert: AlertDetail;
	events: AlertDetailEvent[];
}>;

/** Scrollable list of log lines; the shape every integration renders into. */
export function EventList({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className="max-h-48 space-y-0.5 overflow-y-auto overscroll-contain rounded border bg-background p-1">
			{children}
		</div>
	);
}

export function Chips({ values }: Readonly<{ values: string[] }>) {
	if (values.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-1">
			{values.map((value) => (
				<span
					key={value}
					className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]"
				>
					{value}
				</span>
			))}
		</div>
	);
}

/**
 * A collapsed key → value list. Deliberately generic: whatever the headline
 * box has no room for, or no parser claims, shows up here on its own.
 */
export function ExtraMeta({
	values,
	label,
}: Readonly<{ values: Record<string, string>; label: string }>) {
	const entries = Object.entries(values);
	if (entries.length === 0) return null;
	return (
		<details className="group">
			<summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
				{label} ({entries.length})
			</summary>
			<dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded border bg-background p-1.5 font-mono text-[11px]">
				{entries.map(([key, value]) => (
					<div key={key} className="contents">
						<dt className="text-muted-foreground">{key}</dt>
						<dd className="break-all">{value}</dd>
					</div>
				))}
			</dl>
		</details>
	);
}

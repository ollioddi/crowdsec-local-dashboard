import { cn } from "cn";
import type { ComponentType, ReactNode } from "react";
import type { EventFields, IntegrationId } from "@/common/parsing/types";
import type {
	AlertDetail,
	AlertDetailEvent,
} from "@/features/decisions/api/alert-detail";

/** An event whose fields are already narrowed to one integration's shape. */
export type EventOf<K extends IntegrationId> = AlertDetailEvent & {
	fields: Extract<EventFields, { kind: K }>;
};

/**
 * What every evidence renderer receives: the whole alert, plus only the
 * events its own integration claimed, already typed as that integration's
 * fields. No renderer filters or narrows.
 */
export type EvidenceProps<K extends IntegrationId = IntegrationId> = Readonly<{
	alert: AlertDetail;
	events: EventOf<K>[];
}>;

/**
 * One integration's box: the component, and the fields it draws. Whatever a
 * parser reads that is not in `shownFields` lands in "Other fields" on its
 * own, so a newly parsed value is visible before anyone draws it, and never
 * twice once someone does.
 */
export type EvidenceRenderer<K extends IntegrationId> = {
	Component: ComponentType<EvidenceProps<K>>;
	shownFields: ReadonlySet<keyof Extract<EventFields, { kind: K }>>;
};

/**
 * A muted label in front of a value, so no value stands alone. The label
 * never separates from the first line of its value; the value wraps at
 * spaces first and only breaks inside a word that would otherwise overflow.
 */
export function Labeled({
	label,
	children,
	className,
}: Readonly<{ label: string; children: ReactNode; className?: string }>) {
	return (
		<span className={cn("inline-flex min-w-0 max-w-full gap-1", className)}>
			<span className="shrink-0 text-muted-foreground">{label}</span>
			<span className="min-w-0 wrap-anywhere">{children}</span>
		</span>
	);
}

/**
 * The list of log lines every integration renders into, under a label that
 * says what the lines are. Lines wrap rather than truncate: the path is the
 * evidence. Desktop caps the height and scrolls; on mobile the sheet already
 * scrolls, so nesting a second scroller would fight it.
 */
export function EventList({
	label,
	children,
}: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<Section label={label}>
			<div className="divide-y rounded-md border bg-background md:max-h-96 md:overflow-y-auto md:overscroll-contain">
				{children}
			</div>
		</Section>
	);
}

/**
 * One line: an optional tag on the left, the content, and whatever belongs
 * on the right (status, count, time). Every line of a list has this shape.
 */
export function Line({
	tag,
	tagClassName,
	trailing,
	children,
}: Readonly<{
	tag?: string;
	tagClassName?: string;
	trailing?: ReactNode;
	children: ReactNode;
}>) {
	return (
		<div className="flex items-start gap-2 px-2 py-1.5 font-mono text-xs">
			{tag && (
				<span
					className={cn(
						"mt-px shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] font-bold text-muted-foreground",
						tagClassName,
					)}
				>
					{tag}
				</span>
			)}
			<div className="min-w-0 flex-1">{children}</div>
			{/* Stacked on a phone, where side by side would squeeze the content */}
			{trailing && (
				<div className="flex shrink-0 flex-col items-end gap-0.5 md:flex-row md:items-start md:gap-2">
					{trailing}
				</div>
			)}
		</div>
	);
}

export function Chips({
	label,
	values,
}: Readonly<{ label: string; values: string[] }>) {
	return (
		<Section label={label}>
			{values.length > 0 ? (
				<div className="flex flex-wrap gap-1">
					{values.map((value) => (
						<span
							key={value}
							className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px]"
						>
							{value}
						</span>
					))}
				</div>
			) : (
				<p className="text-xs text-muted-foreground">None recorded</p>
			)}
		</Section>
	);
}

/**
 * Key → value pairs in a grid that fills the width: one pair per row on a
 * phone, two side by side on desktop. Values wrap, never truncate.
 */
export function FieldGrid({
	values,
}: Readonly<{ values: Record<string, string> }>) {
	const entries = Object.entries(values);
	if (entries.length === 0) return null;
	return (
		<dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-[11px] md:grid-cols-[max-content_minmax(0,1fr)_max-content_minmax(0,1fr)] md:gap-x-4">
			{entries.map(([key, value]) => (
				<div key={key} className="contents">
					<dt className="text-muted-foreground">{key}</dt>
					<dd className="break-all">{value}</dd>
				</div>
			))}
		</dl>
	);
}

/** A labelled block, the same furniture the lists use, for anything else. */
export function Section({
	label,
	children,
}: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className="space-y-1">
			<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			{children}
		</div>
	);
}

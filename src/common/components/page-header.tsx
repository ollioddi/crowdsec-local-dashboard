import type { ReactNode } from "react";
import { cn } from "@/common/lib/utils";

export type PageHeaderStat = {
	label: string;
	value: ReactNode;
	/** Lifts the number out of the muted row, for the stat that matters most. */
	highlight?: boolean;
};

/** Counts sit inline with the title to save a row on mobile. */
export function PageHeader({
	title,
	summary = [],
	actions,
}: Readonly<{
	title: string;
	summary?: PageHeaderStat[];
	actions?: ReactNode;
}>) {
	return (
		<div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
				<h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
					{title}
				</h1>
				{summary.length > 0 && (
					<p className="flex items-baseline gap-x-2 text-sm text-muted-foreground">
						{summary.map((stat, index) => (
							<span key={stat.label} className="flex items-baseline gap-1">
								{index > 0 && <span aria-hidden>·</span>}
								<span
									className={cn(
										"font-medium tabular-nums",
										stat.highlight && "text-foreground",
									)}
								>
									{stat.value}
								</span>
								{stat.label}
							</span>
						))}
					</p>
				)}
			</div>
			{actions}
		</div>
	);
}

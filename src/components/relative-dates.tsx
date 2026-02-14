import moment from "moment";
import { useRelativeTime } from "@/hooks/use-relative-time";

interface RelativeTimeProps {
	/** The date to display. Shows fallback when null/undefined. */
	date: string | Date | null | undefined;
	/** Text shown when date is null/undefined. Defaults to "-" */
	fallback?: string;
	/** moment format string for the formatted date. Defaults to "DD/MM/YYYY HH:mm" */
	format?: string;
}

/**
 * Renders a formatted date with a live-updating relative time string below it.
 *
 * @example
 * 11/02/2026 14:30
 * 2 minutes ago
 */
export function RelativeTime({
	date,
	fallback = "-",
	format = "DD/MM/YYYY HH:mm",
}: Readonly<RelativeTimeProps>) {
	const relative = useRelativeTime(date);

	if (!date) {
		return <span className="text-muted-foreground">{fallback}</span>;
	}

	return (
		<div className="flex flex-col">
			<span className="text-sm font-medium">{moment(date).format(format)}</span>
			<span className="text-sm text-muted-foreground">{relative}</span>
		</div>
	);
}

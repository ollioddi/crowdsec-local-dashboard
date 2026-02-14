import moment from "moment";
import { useEffect, useState } from "react";

/**
 * Returns a live-updating relative time string (e.g. "2 minutes ago", "in 3 hours").
 * Refresh interval adapts based on how far away the date is:
 *   < 1 min  → every 1s
 *   < 1 hour → every 30s
 *   < 1 day  → every 5 min
 *   else     → every 1 hour
 */
export function useRelativeTime(
	date: string | Date | null | undefined,
): string {
	const [relative, setRelative] = useState(() =>
		date ? moment(date).fromNow() : "",
	);

	useEffect(() => {
		if (!date) return;

		const update = () => setRelative(moment(date).fromNow());
		update();

		const getInterval = () => {
			const diffMs = Math.abs(moment().diff(moment(date)));
			if (diffMs < 60_000) return 1_000;
			if (diffMs < 3_600_000) return 30_000;
			if (diffMs < 86_400_000) return 300_000;
			return 3_600_000;
		};

		let timer: ReturnType<typeof setTimeout>;
		const schedule = () => {
			timer = setTimeout(() => {
				update();
				schedule();
			}, getInterval());
		};
		schedule();

		return () => clearTimeout(timer);
	}, [date]);

	return relative;
}

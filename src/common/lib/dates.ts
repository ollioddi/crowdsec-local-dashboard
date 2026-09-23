import moment from "moment";

/**
 * Table and field rendering: unambiguous, day first. The formats live here so
 * a timestamp reads the same everywhere and `moment` has a single seam.
 * Relative ("2 hours ago") rendering lives in `use-relative-time`, which
 * updates on a timer.
 */
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";

/** Compact form for dense lists, where the year is noise. */
const SHORT_DATE_TIME_FORMAT = "DD/MM HH:mm";

export function formatDateTime(value: Date | string | number): string {
	return moment(value).format(DATE_TIME_FORMAT);
}

export function formatShortDateTime(value: Date | string | number): string {
	return moment(value).format(SHORT_DATE_TIME_FORMAT);
}

/** A parsed date, or null when the input is missing or malformed. */
export function toDateOrNull(value: string | undefined): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Rounds to the unit the value was almost certainly expressed in. */
function formatSpan(ms: number): string {
	const seconds = Math.round(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.round(ms / 60_000);
	if (minutes % 1440 === 0) return `${minutes / 1440}d`;
	if (minutes % 60 === 0) return `${minutes / 60}h`;
	const hours = Math.floor(minutes / 60);
	return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/** Whole units in words, since a configured ban is read, not scanned. */
export function humanSpan(ms: number): string {
	const plural = (n: number, unit: string) =>
		`${n} ${unit}${n === 1 ? "" : "s"}`;
	const minutes = Math.round(ms / 60_000);
	if (minutes % 1440 === 0) return plural(minutes / 1440, "day");
	if (minutes % 60 === 0) return plural(minutes / 60, "hour");
	if (minutes < 60) return plural(minutes, "minute");
	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * How long a window lasted, phrased for a sentence:
 * "in under a second", "over 4m". Null when either end is missing.
 */
export function describeWindow(
	start: Date | string | null | undefined,
	stop: Date | string | null | undefined,
): string | null {
	if (!start || !stop) return null;
	const from = moment(start);
	const to = moment(stop);
	if (!from.isValid() || !to.isValid()) return null;
	const ms = to.diff(from);
	if (ms < 0) return null;
	return ms < 1000 ? "in under a second" : `over ${formatSpan(ms)}`;
}

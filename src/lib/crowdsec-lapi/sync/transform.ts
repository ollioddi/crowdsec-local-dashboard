import geoip from "geoip-country";
import type { CrowdSecDecision } from "@/lib/crowdsec-lapi/types";

export function lookupCountry(ip: string): string | null {
	const result = geoip.lookup(ip);
	return result?.country ?? null;
}

/**
 * Parse a Go-style duration string (e.g. "3h59m43.191505609s") to milliseconds.
 * The bouncer API's `duration` field is the *remaining* time.
 */
const DURATION_HOURS_RE = /([\d.]+)h/;
const DURATION_MINUTES_RE = /([\d.]+)m(?!s)/;
const DURATION_SECONDS_RE = /([\d.]+)s/;

export function parseDurationMs(duration: string): number {
	const sign = duration.startsWith("-") ? -1 : 1;
	let ms = 0;
	const h = DURATION_HOURS_RE.exec(duration);
	const m = DURATION_MINUTES_RE.exec(duration);
	const s = DURATION_SECONDS_RE.exec(duration);
	if (h) ms += Number.parseFloat(h[1]) * 3_600_000;
	if (m) ms += Number.parseFloat(m[1]) * 60_000;
	if (s) ms += Number.parseFloat(s[1]) * 1_000;
	return sign * ms;
}

export function computeExpiresAt(d: CrowdSecDecision): Date {
	return d.until
		? new Date(d.until)
		: new Date(Date.now() + parseDurationMs(d.duration));
}

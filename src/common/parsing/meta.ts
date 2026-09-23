export type MetaEntry = { key: string; value: string };

/** CrowdSec writes `-` (and sometimes nothing) for a value it does not have. */
function isBlank(value: string | undefined): value is undefined {
	return value === undefined || value === "-" || value === "";
}

/**
 * One CrowdSec meta bag with typed readers.
 *
 * CrowdSec ships every value as a string in a flat key/value list, so each
 * reader needs the same coercions. The view also tracks which keys were read,
 * which is what lets the parsers hand the UI everything they did *not*
 * recognise (`unparsed()`) instead of silently dropping it.
 */
export class MetaView {
	private readonly values: Map<string, string>;
	private readonly read = new Set<string>();

	constructor(entries: readonly MetaEntry[] | undefined) {
		this.values = new Map((entries ?? []).map((e) => [e.key, e.value]));
	}

	/**
	 * Reads without claiming. Discriminators (`matches()`) use this: marking
	 * `log_type` as read there would hide it from `unparsed()` for exactly the
	 * unrecognised sources that need it shown.
	 */
	peek(key: string): string | undefined {
		const value = this.values.get(key);
		return isBlank(value) ? undefined : value;
	}

	has(key: string): boolean {
		return this.peek(key) !== undefined;
	}

	/** First non-blank value among the keys, all of them marked as read. */
	str(...keys: string[]): string | undefined {
		let found: string | undefined;
		for (const key of keys) {
			this.read.add(key);
			found ??= this.peek(key);
		}
		return found;
	}

	num(...keys: string[]): number | undefined {
		const raw = this.str(...keys);
		if (raw === undefined) return undefined;
		const parsed = Number.parseInt(raw, 10);
		return Number.isNaN(parsed) ? undefined : parsed;
	}

	bool(...keys: string[]): boolean | undefined {
		const raw = this.str(...keys);
		if (raw === undefined) return undefined;
		return raw.toLowerCase() === "true";
	}

	/**
	 * A JSON-encoded string array, which CrowdSec uses for repeated values
	 * (`rule_ids`, `dst_port`, every alert-level key). Falls back to the bare
	 * string so a scalar value is never lost.
	 */
	list(...keys: string[]): string[] | undefined {
		const raw = this.str(...keys);
		if (raw === undefined) return undefined;
		try {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				const values = parsed.map(String).filter((v) => !isBlank(v));
				return values.length > 0 ? values : undefined;
			}
		} catch {
			// not JSON, fall through to the scalar
		}
		return [raw];
	}

	/** Marks keys as read without returning them, for discriminators. */
	skip(...keys: string[]): void {
		for (const key of keys) this.read.add(key);
	}

	/**
	 * Keys no parser claimed. Rendered as-is so a new CrowdSec field shows up in
	 * the UI the day it appears, before anyone teaches a parser about it.
	 */
	unparsed(): Record<string, string> {
		const out: Record<string, string> = {};
		for (const [key, value] of this.values) {
			if (!this.read.has(key) && !isBlank(value)) out[key] = value;
		}
		return out;
	}
}

/** CrowdSec's key/value list as a plain record, for storage. */
export function metaToRecord(
	entries: readonly MetaEntry[] | undefined,
): Record<string, string> {
	return Object.fromEntries((entries ?? []).map((e) => [e.key, e.value]));
}

/** The stored record back as CrowdSec's key/value list, for re-parsing. */
export function recordToMeta(
	record: Record<string, string> | undefined,
): MetaEntry[] {
	return Object.entries(record ?? {}).map(([key, value]) => ({ key, value }));
}

/** Distinct, non-empty values pulled from a set of events. */
export function distinctValues(
	events: readonly MetaView[],
	pick: (meta: MetaView) => string | undefined,
): string[] {
	const seen = new Set<string>();
	for (const event of events) {
		const value = pick(event);
		if (value) seen.add(value);
	}
	return [...seen];
}

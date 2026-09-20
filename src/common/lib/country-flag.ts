/** Emoji flag for an ISO 3166-1 alpha-2 country code, or an empty string */
export function countryFlag(code: string | null | undefined): string {
	if (code?.length !== 2) return "";
	return String.fromCodePoint(
		...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
	);
}

let regionNames: Intl.DisplayNames | null | undefined;

/** "US" to "United States", falling back to the code itself. */
export function countryName(code: string | null | undefined): string {
	if (code?.length !== 2) return "";
	if (regionNames === undefined) {
		try {
			regionNames = new Intl.DisplayNames(["en"], { type: "region" });
		} catch {
			regionNames = null;
		}
	}
	const upper = code.toUpperCase();
	try {
		return regionNames?.of(upper) ?? upper;
	} catch {
		return upper;
	}
}

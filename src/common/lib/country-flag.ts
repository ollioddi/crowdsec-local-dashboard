/** Emoji flag for an ISO 3166-1 alpha-2 country code, or an empty string */
export function countryFlag(code: string | null | undefined): string {
	if (code?.length !== 2) return "";
	return String.fromCodePoint(
		...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
	);
}

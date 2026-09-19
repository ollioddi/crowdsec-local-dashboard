export const GITHUB_REPO = "ollioddi/crowdsec-local-dashboard";
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

/** Tag name for release builds (`v0.4.1-beta`); `dev` or a branch name otherwise. */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? "dev";

type ParsedVersion = { numbers: [number, number, number]; pre: string | null };

function parseVersion(version: string): ParsedVersion | null {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(
		version.trim(),
	);
	if (!match) return null;
	return {
		numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
		pre: match[4] ?? null,
	};
}

/** True when `candidate` is a higher release than `current`. Unparseable input is never newer. */
export function isNewerVersion(candidate: string, current: string): boolean {
	const a = parseVersion(candidate);
	const b = parseVersion(current);
	if (!a || !b) return false;
	for (let i = 0; i < 3; i++) {
		if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] > b.numbers[i];
	}
	// Same numbers: a release beats a prerelease, otherwise compare the tags
	if (a.pre === b.pre) return false;
	if (a.pre === null) return true;
	if (b.pre === null) return false;
	return a.pre.localeCompare(b.pre, "en", { numeric: true }) > 0;
}

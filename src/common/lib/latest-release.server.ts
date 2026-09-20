import { env } from "@/common/lib/env";
import { errorFields, logger } from "@/common/lib/logging/logger";
import { APP_VERSION, GITHUB_REPO } from "./version";

const log = logger("update-check");
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=5`;
const OK_TTL_MS = 6 * 60 * 60 * 1000;
const ERROR_TTL_MS = 15 * 60 * 1000;

export type LatestRelease = { version: string; url: string };

let cached: { until: number; release: LatestRelease | null } | undefined;
let inFlight: Promise<LatestRelease | null> | undefined;

/** Newest published GitHub release, cached so GitHub is asked a few times a day at most. */
export async function getLatestRelease(): Promise<LatestRelease | null> {
	if (!env.UPDATE_CHECK) return null;
	if (cached && cached.until > Date.now()) return cached.release;
	inFlight ??= refreshLatestRelease().finally(() => {
		inFlight = undefined;
	});
	return inFlight;
}

async function refreshLatestRelease(): Promise<LatestRelease | null> {
	try {
		const release = await fetchLatestRelease();
		cached = { until: Date.now() + OK_TTL_MS, release };
		return release;
	} catch (err) {
		log.warn(
			"Could not read GitHub releases: {errorMessage}",
			errorFields(err),
		);
		cached = { until: Date.now() + ERROR_TTL_MS, release: null };
		return null;
	}
}

async function fetchLatestRelease(): Promise<LatestRelease | null> {
	const res = await fetch(RELEASES_API_URL, {
		headers: {
			Accept: "application/vnd.github+json",
			"User-Agent": `crowdsec-dashboard/${APP_VERSION}`,
		},
		signal: AbortSignal.timeout(5000),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const releases: { tag_name: string; html_url: string; draft: boolean }[] =
		await res.json();
	const release = releases.find((r) => !r.draft);
	return release ? { version: release.tag_name, url: release.html_url } : null;
}

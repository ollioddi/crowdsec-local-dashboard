/**
 * Captures the README and portfolio screenshots from a seeded demo database.
 *
 *   pnpm screenshots                  reseed, build, capture everything
 *   pnpm screenshots --only=decisions capture the scenes whose name matches
 *   pnpm screenshots --keep-data      reuse the database from the last run
 *   pnpm screenshots --no-build       reuse the last production build
 *   pnpm screenshots --no-readme      leave README.md alone
 */
import { spawn, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type Browser,
	type BrowserContext,
	chromium,
	type Page,
} from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = path.join(root, ".demo");
/** Where the images live, relative to the repo root and to README.md. */
const imageDir = "docs/images";
const outDir = path.join(root, imageDir);
const port = 3210;
const origin = `http://localhost:${port}`;
const RELEASES_URL =
	"https://github.com/ollioddi/crowdsec-local-dashboard/releases";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);

const serverEnv: NodeJS.ProcessEnv = {
	...process.env,
	NODE_ENV: "production",
	PORT: String(port),
	DATABASE_URL: `file:${path.join(demoDir, "demo.db")}`,
	BETTER_AUTH_SECRET: "demo-screenshot-secret-not-for-production",
	BETTER_AUTH_URL: origin,
	UPDATE_CHECK: "false",
	LOG_LEVEL: "warn",
	// Left unset on purpose: with no LAPI the poller never overwrites the demo data.
	LAPI_URL: "",
	LAPI_BOUNCER_API_TOKEN: "",
	// Enough for the login shot to show the SSO button; discovery only runs on click
	OIDC_CLIENT_ID: "demo-client",
	OIDC_CLIENT_SECRET: "demo-secret",
	OIDC_ISSUER_URL: "https://sso.example.com/application/o/crowdsec-dashboard/",
};

type Device = "desktop" | "mobile";

type Featured = { id: number; ip: string };

type Scene = {
	name: string;
	device: Device;
	caption: string;
	/** Expanded rows run past the fold, so those scenes capture the whole page. */
	fullPage?: boolean;
	/** The one shot the README leads with. */
	hero?: boolean;
	/** Captured for the docs only; the README tables stay curated. */
	readme?: false;
	/** Runs before signing in */
	signedOut?: boolean;
	run: (page: Page, featured: Record<string, Featured>) => Promise<void>;
};

// Short enough that the expanded row dominates the frame
const EXPANDED_PAGE_SIZE = 5;

const LIST_PAGE_SIZE = 15;

const viewports = {
	desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
	mobile: {
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 3,
		isMobile: true,
		hasTouch: true,
	},
} as const;

function run(command: string, commandArgs: string[], env = serverEnv) {
	return new Promise<void>((resolve, reject) => {
		const child = spawn(command, commandArgs, {
			cwd: root,
			env,
			stdio: "inherit",
		});
		child.on("error", reject);
		child.on("exit", (code) =>
			code === 0
				? resolve()
				: reject(
						new Error(
							`${command} ${commandArgs.join(" ")} exited with ${code}`,
						),
					),
		);
	});
}

/** Newest release tag, so the sidebar shows a version instead of "dev". */
function latestTag() {
	const result = spawnSync("git", ["describe", "--tags", "--abbrev=0"], {
		cwd: root,
		encoding: "utf8",
	});
	return result.stdout.trim() || "dev";
}

async function seed() {
	rmSync(path.join(demoDir, "demo.db"), { force: true });
	mkdirSync(demoDir, { recursive: true });
	await run("pnpm", ["exec", "prisma", "migrate", "deploy"]);
	await run("pnpm", ["exec", "tsx", "scripts/demo-data.ts"]);
}

async function startServer() {
	// Something already listening would quietly serve stale pages for the run.
	const inUse = await fetch(`${origin}/api/health`).then(
		() => true,
		() => false,
	);
	if (inUse) {
		throw new Error(`Port ${port} is already in use; stop that server first`);
	}

	const child = spawn("node", [".output/server/index.mjs"], {
		cwd: root,
		env: serverEnv,
		stdio: "inherit",
	});
	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(`${origin}/api/health`);
			if (response.ok) return child;
		} catch {
			// not listening yet
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	child.kill();
	throw new Error("The demo server never became healthy");
}

/** Nothing newer than the captured branch exists, so the badge is handed a release. */
async function showUpdateAvailable(context: BrowserContext) {
	const nullLatest =
		/("k":\["current","latest"\],"v":\[\{"t":1,"s":"(v?[^"]+)"\},)\{"t":2,"s":0\}/;

	await context.route("**/_serverFn/**", async (route) => {
		try {
			const response = await route.fetch();
			const text = await response.text();
			const patched = text.replace(
				nullLatest,
				(_all, head: string, current: string) => {
					const version = nextVersion(current);
					const url = `${RELEASES_URL}/tag/${version}`;
					return `${head}{"t":10,"i":900,"p":{"k":["version","url"],"v":[{"t":1,"s":"${version}"},{"t":1,"s":"${url}"}]},"o":0}`;
				},
			);
			await route.fulfill({ response, body: patched });
		} catch {
			// The context can close with a request still in flight
		}
	});
}

function nextVersion(current: string): string {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(current);
	if (!match) return "v0.6.0-beta";
	return `v${match[1]}.${Number(match[2]) + 1}.0${match[4] ?? ""}`;
}

/** Holds the gesture past its release threshold so the indicator stays in frame. */
async function holdPullToRefresh(page: Page) {
	// A string body, because the bundler rewrites named inner functions and the
	// browser then trips over its __name helper
	await page.evaluate(`(() => {
		const scroller = document.querySelector("[data-scroll-container]");
		if (!scroller) throw new Error("No scroll container to pull on");
		const fire = (type, clientY) => {
			const touch = new Touch({ identifier: 1, target: scroller, clientX: 195, clientY });
			scroller.dispatchEvent(new TouchEvent(type, {
				bubbles: true,
				cancelable: true,
				touches: [touch],
				targetTouches: [touch],
				changedTouches: [touch],
			}));
		};
		fire("touchstart", 200);
		for (let y = 220; y <= 400; y += 20) fire("touchmove", y);
	})()`);
	await page.evaluate(() => new Promise(requestAnimationFrame));
}

async function settle(page: Page) {
	await page.waitForLoadState("networkidle");
	await page.evaluate(() => document.fonts.ready);
	// One frame, so the layout effects that measure virtual rows have run
	await page.evaluate(() => new Promise(requestAnimationFrame));
}

async function gotoDecisions(page: Page, search: Record<string, unknown>) {
	const query = Object.entries(search)
		.map(
			([key, value]) =>
				`${key}=${encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value))}`,
		)
		.join("&");
	await page.goto(`${origin}/decisions?${query}`);
	await settle(page);
}

/** On a phone the expanded row is a sheet; wait for its evidence to render. */
async function showEvidence(page: Page) {
	const evidence = page.locator('[data-slot="alert-evidence"]').first();
	await evidence.waitFor();
	await evidence.scrollIntoViewIfNeeded();
}

const scenes: Scene[] = [
	{
		name: "desktop-login",
		device: "desktop",
		signedOut: true,
		caption: "Login with optional OIDC SSO (the button label is configurable)",
		run: async (page) => {
			await page.goto(`${origin}/login`);
			await settle(page);
		},
	},
	{
		name: "desktop-decisions",
		device: "desktop",
		caption: "Decisions - every filter, sort and page lives in the URL",
		fullPage: true,
		hero: true,
		run: async (page) => {
			await gotoDecisions(page, { pageSize: LIST_PAGE_SIZE });
		},
	},
	{
		name: "desktop-decisions-filters",
		device: "desktop",
		caption:
			"Decisions - filter chips with per-column operators and facet counts",
		run: async (page) => {
			await gotoDecisions(page, {
				pageSize: LIST_PAGE_SIZE,
				filters: { status: { operator: "isAnyOf", value: ["Active"] } },
			});
			await page.getByRole("button", { name: /^Filter$/ }).click();
			await page.getByRole("option", { name: "Decision" }).click();
			await page.getByRole("button", { name: "Apply" }).waitFor();
		},
	},
	{
		name: "desktop-decisions-expanded",
		device: "desktop",
		caption: "Decisions - expanded row showing the HTTP requests behind a ban",
		fullPage: true,
		run: async (page, featured) => {
			await gotoDecisions(page, {
				pageSize: EXPANDED_PAGE_SIZE,
				expanded: [String(featured.paths.id)],
			});
			await page.locator('[data-slot="alert-evidence"]').first().waitFor();
		},
	},
	{
		name: "desktop-decisions-appsec",
		device: "desktop",
		caption: "Decisions - expanded row showing the WAF rules that fired",
		fullPage: true,
		run: async (page, featured) => {
			await gotoDecisions(page, {
				pageSize: EXPANDED_PAGE_SIZE,
				expanded: [String(featured.rules.id)],
			});
			await page.locator('[data-slot="alert-evidence"]').first().waitFor();
		},
	},
	{
		name: "desktop-decisions-ports",
		device: "desktop",
		readme: false,
		caption:
			"Decisions - expanded row for a port scan, connections grouped by rule",
		fullPage: true,
		run: async (page, featured) => {
			await gotoDecisions(page, {
				pageSize: EXPANDED_PAGE_SIZE,
				expanded: [String(featured.ports.id)],
			});
			await page.locator('[data-slot="alert-evidence"]').first().waitFor();
		},
	},
	{
		name: "desktop-decisions-ssh",
		device: "desktop",
		readme: false,
		caption:
			"Decisions - expanded row for an SSH brute force, one line per attempt",
		fullPage: true,
		run: async (page, featured) => {
			await gotoDecisions(page, {
				pageSize: EXPANDED_PAGE_SIZE,
				expanded: [String(featured.usernames.id)],
			});
			await page.locator('[data-slot="alert-evidence"]').first().waitFor();
		},
	},
	{
		name: "desktop-hosts",
		device: "desktop",
		caption: "Hosts - sortable, filterable IP list with active ban counts",
		fullPage: true,
		run: async (page) => {
			await page.goto(`${origin}/hosts?pageSize=${LIST_PAGE_SIZE}`);
			await settle(page);
		},
	},
	{
		name: "desktop-users",
		device: "desktop",
		caption: "Users - local accounts and SSO logins side by side",
		fullPage: true,
		run: async (page) => {
			await page.goto(`${origin}/users`);
			await settle(page);
		},
	},
	{
		name: "mobile-login",
		device: "mobile",
		signedOut: true,
		caption: "Login with optional OIDC SSO (the button label is configurable)",
		run: async (page) => {
			await page.goto(`${origin}/login`);
			await settle(page);
		},
	},
	{
		name: "mobile-decisions",
		device: "mobile",
		caption: "Decisions - cards instead of a sideways scroll",
		run: async (page) => {
			await gotoDecisions(page, { pageSize: LIST_PAGE_SIZE });
		},
	},
	{
		name: "mobile-decisions-filters",
		device: "mobile",
		caption: "Decisions - any number of filters costs one row on a phone",
		run: async (page) => {
			await gotoDecisions(page, {
				pageSize: LIST_PAGE_SIZE,
				filters: {
					status: { operator: "isAnyOf", value: ["Active"] },
					type: { operator: "isAnyOf", value: ["ban"] },
					origin: { operator: "isAnyOf", value: ["crowdsec"] },
				},
			});
		},
	},
	{
		name: "mobile-decisions-http",
		device: "mobile",
		caption:
			"Decisions - the alert sheet, here with the HTTP requests behind a ban",
		run: async (page, featured) => {
			await gotoDecisions(page, {
				pageSize: EXPANDED_PAGE_SIZE,
				q: featured.paths.ip,
				expanded: [String(featured.paths.id)],
			});
			await showEvidence(page);
		},
	},
	{
		name: "mobile-decisions-ports",
		device: "mobile",
		caption:
			"Decisions - the alert sheet for a port scan, connections grouped by rule",
		run: async (page, featured) => {
			await gotoDecisions(page, {
				pageSize: EXPANDED_PAGE_SIZE,
				q: featured.ports.ip,
				expanded: [String(featured.ports.id)],
			});
			await showEvidence(page);
		},
	},
	{
		name: "mobile-decisions-ssh",
		device: "mobile",
		caption:
			"Decisions - the alert sheet for an SSH brute force, one line per attempt",
		run: async (page, featured) => {
			await gotoDecisions(page, {
				pageSize: EXPANDED_PAGE_SIZE,
				q: featured.usernames.ip,
				expanded: [String(featured.usernames.id)],
			});
			await showEvidence(page);
		},
	},
	{
		name: "mobile-decisions-appsec",
		device: "mobile",
		readme: false,
		caption: "Decisions - the alert sheet for the WAF rules that fired",
		run: async (page, featured) => {
			await gotoDecisions(page, {
				pageSize: EXPANDED_PAGE_SIZE,
				q: featured.rules.ip,
				expanded: [String(featured.rules.id)],
			});
			await showEvidence(page);
		},
	},
	{
		name: "mobile-users-create",
		device: "mobile",
		caption:
			"Users - the create form opens in a drawer instead of squashing the table",
		run: async (page) => {
			await page.goto(`${origin}/users`);
			await settle(page);
			await page.getByRole("button", { name: "New user" }).click();
			await page.getByRole("dialog").waitFor();
			await settle(page);
		},
	},
	{
		name: "mobile-hosts-refresh",
		device: "mobile",
		caption: "Hosts - pull the list down to resync with CrowdSec",
		run: async (page) => {
			await page.goto(`${origin}/hosts?pageSize=${LIST_PAGE_SIZE}`);
			await settle(page);
			await holdPullToRefresh(page);
		},
	},
	{
		name: "mobile-hosts",
		device: "mobile",
		caption: "Hosts - sortable, filterable IP list with active ban counts",
		run: async (page) => {
			await page.goto(`${origin}/hosts?pageSize=${LIST_PAGE_SIZE}`);
			await settle(page);
		},
	},
	{
		name: "mobile-users",
		device: "mobile",
		caption: "Users - local accounts and SSO logins side by side",
		run: async (page) => {
			await page.goto(`${origin}/users`);
			await settle(page);
		},
	},
	{
		name: "mobile-sidebar",
		device: "mobile",
		caption: "Sidebar - slide-out navigation with theme toggle",
		run: async (page) => {
			await page.goto(`${origin}/hosts?pageSize=${LIST_PAGE_SIZE}`);
			await settle(page);
			await page.locator('[data-slot="sidebar-trigger"]').click();
			await page.getByRole("dialog").waitFor();
			// A focus ring or a hover tooltip would end up in the still
			await page.evaluate(() =>
				(document.activeElement as HTMLElement | null)?.blur(),
			);
			await page.mouse.move(200, 700);
			await settle(page);
		},
	},
];

async function capture(
	browser: Browser,
	device: Device,
	list: Scene[],
	login: { username: string; password: string },
	featured: Record<string, Featured>,
) {
	const context = await browser.newContext({
		...viewports[device],
		colorScheme: "dark",
	});
	// Motion and the "sync is not configured" banner are noise in a still image.
	await context.addInitScript(() => {
		localStorage.setItem("crowdsec-dashboard-theme", "dark");
		document.addEventListener("DOMContentLoaded", () => {
			const style = document.createElement("style");
			style.textContent = `*,*::before,*::after{transition:none!important;animation:none!important}
				[data-slot="sync-banner"]{display:none!important}`;
			document.head.append(style);
		});
	});
	await showUpdateAvailable(context);
	const page = await context.newPage();

	const loginScene = list.find((scene) => scene.signedOut);
	if (loginScene) {
		await loginScene.run(page, featured);
		await shoot(page, loginScene);
	}

	await page.goto(`${origin}/login`);
	await page.fill("#username", login.username);
	await page.fill("#password", login.password);
	await page.getByRole("button", { name: "Sign in", exact: true }).click();
	// The router appends its validated defaults, so match the path only.
	await page.waitForURL((url) => url.pathname === "/hosts", {
		timeout: 15_000,
	});
	// The badge only mounts in the desktop sidebar, and it fills in asynchronously
	if (device === "desktop") {
		await page
			.getByText(/^Update available/)
			.first()
			.waitFor();
	}

	for (const scene of list) {
		if (scene === loginScene) continue;
		await scene.run(page, featured);
		await shoot(page, scene);
	}

	await context.unrouteAll({ behavior: "ignoreErrors" });
	await context.close();
}

async function shoot(page: Page, scene: Scene) {
	const file = path.join(outDir, `crowdsec-dashboard-${scene.name}.png`);
	await page.screenshot({ path: file, fullPage: scene.fullPage ?? false });
	console.log(`  ${path.relative(root, file)}`);
}

function readmeTable(list: Scene[], width: number, perRow: number) {
	const rows: string[] = [];
	for (let i = 0; i < list.length; i += perRow) {
		const cells = list
			.slice(i, i + perRow)
			.map(
				(scene) =>
					`    <td align="center"><img src="${imageDir}/crowdsec-dashboard-${scene.name}.png" width="${width}" alt="${scene.caption}"/><br/><sub>${scene.caption}</sub></td>`,
			);
		rows.push(`  <tr>\n${cells.join("\n")}\n  </tr>`);
	}
	return `<table>\n${rows.join("\n")}\n</table>`;
}

/** Rewrites the marked blocks in the README from the scene list above. */
function updateReadme() {
	const file = path.join(root, "README.md");
	const hero = scenes.find((scene) => scene.hero);
	const blocks: Record<string, string> = {
		hero: hero
			? `<img src="${imageDir}/crowdsec-dashboard-${hero.name}.png" width="600" alt="${hero.caption}"/><br/>`
			: "",
		desktop: readmeTable(
			scenes.filter(
				(scene) =>
					scene.device === "desktop" && !scene.hero && scene.readme !== false,
			),
			420,
			2,
		),
		mobile: readmeTable(
			scenes.filter(
				(scene) => scene.device === "mobile" && scene.readme !== false,
			),
			230,
			3,
		),
	};

	let text = readFileSync(file, "utf8");
	for (const [key, block] of Object.entries(blocks)) {
		const marked = new RegExp(
			String.raw`(<!-- screenshots:${key} -->)[\s\S]*?(<!-- /screenshots:${key} -->)`,
		);
		if (!marked.test(text))
			throw new Error(`README.md has no screenshots:${key} markers`);
		text = text.replace(marked, `$1\n${block}\n$2`);
	}
	writeFileSync(file, text);
	console.log("README.md updated");
}

async function main() {
	if (!flag("keep-data")) await seed();
	if (!flag("no-build")) {
		await run("pnpm", ["build"], {
			...serverEnv,
			VITE_APP_VERSION: latestTag(),
		});
	}
	if (!existsSync(path.join(root, ".output/server/index.mjs"))) {
		throw new Error("No production build found; run without --no-build");
	}

	const manifest = JSON.parse(
		readFileSync(path.join(demoDir, "manifest.json"), "utf8"),
	) as {
		login: { username: string; password: string };
		featured: Record<string, Featured>;
	};

	const selected = only
		? scenes.filter((scene) => scene.name.includes(only))
		: scenes;
	if (selected.length === 0) throw new Error(`No scene matches --only=${only}`);

	const server = await startServer();
	const browser = await chromium.launch().catch((error) => {
		throw new Error(
			`Could not start Chromium: ${error.message}\nRun "pnpm exec playwright install chromium" once before the first capture.`,
		);
	});
	try {
		for (const device of ["desktop", "mobile"] as const) {
			const list = selected.filter((scene) => scene.device === device);
			if (list.length === 0) continue;
			console.log(`${device}:`);
			await capture(browser, device, list, manifest.login, manifest.featured);
		}
	} finally {
		await browser.close();
		server.kill();
	}
	console.log(`\n${selected.length} screenshots written to readme/`);
	// Always built from the full scene list, so --only never drops images.
	if (!flag("no-readme")) updateReadme();
}

await main();

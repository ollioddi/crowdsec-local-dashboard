/** Seeds a throwaway screenshot database. Deletes every row, so .demo/ only. */
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractAlertData } from "@/common/alert-types/alert-types";
import { createUserAccount } from "@/common/auth/create-user-account.server";
import type { CrowdSecAlert } from "@/common/crowdsec-lapi/types";
import { prisma } from "@/common/lib/db";
import { env } from "@/common/lib/env";
import type { DecisionType } from "@/generated/prisma/enums.js";

export const DEMO_LOGIN = { username: "admin", password: "crowdsec-demo" };

const HOST_COUNT = 64;
const DECISION_COUNT = 260;
const DAYS_OF_HISTORY = 14;

// Reserved ranges (RFC 5737, RFC 2544): real-looking, never anyone's, no blurring
const IP_BLOCKS = [
	{ prefix: "198.18", octets: 2 },
	{ prefix: "198.19", octets: 2 },
	{ prefix: "192.0.2", octets: 1 },
	{ prefix: "198.51.100", octets: 1 },
	{ prefix: "203.0.113", octets: 1 },
];

const NETWORKS = [
	{ country: "CN", asNumber: "4134", asName: "CHINANET-BACKBONE" },
	{ country: "CN", asNumber: "45090", asName: "TENCENT-NET-AP" },
	{ country: "RU", asNumber: "49505", asName: "SELECTEL" },
	{ country: "US", asNumber: "14061", asName: "DIGITALOCEAN-ASN" },
	{ country: "US", asNumber: "16509", asName: "AMAZON-02" },
	{ country: "DE", asNumber: "24940", asName: "HETZNER-AS" },
	{ country: "NL", asNumber: "60781", asName: "LEASEWEB-NL-AMS-01" },
	{ country: "FR", asNumber: "16276", asName: "OVH SAS" },
	{ country: "GB", asNumber: "20860", asName: "IOMART-AS" },
	{ country: "BR", asNumber: "28573", asName: "CLARO S.A." },
	{ country: "IN", asNumber: "55836", asName: "RELIANCE-JIO" },
	{ country: "VN", asNumber: "45899", asName: "VNPT-AS-VN" },
	{ country: "SG", asNumber: "132203", asName: "TENCENT-NET-AP-SG" },
	{ country: "KR", asNumber: "4766", asName: "KIXS-AS-KR" },
];

const SCENARIOS = [
	{ name: "crowdsecurity/http-probing", family: "http", weight: 22 },
	{ name: "crowdsecurity/http-crawl-non_statics", family: "http", weight: 14 },
	{ name: "crowdsecurity/http-bad-user-agent", family: "http", weight: 10 },
	{ name: "crowdsecurity/http-sensitive-files", family: "http", weight: 8 },
	{ name: "crowdsecurity/CVE-2017-9841", family: "http", weight: 7 },
	{
		name: "crowdsecurity/http-path-traversal-probing",
		family: "http",
		weight: 5,
	},
	{ name: "crowdsecurity/ssh-bf", family: "ssh", weight: 16 },
	{ name: "crowdsecurity/ssh-slow-bf", family: "ssh", weight: 6 },
	{ name: "firewallservices/pf-scan-multi_ports", family: "pf", weight: 12 },
] as const;

type Family = (typeof SCENARIOS)[number]["family"];

const HTTP_PATHS: Record<string, string[]> = {
	"crowdsecurity/http-probing": [
		"/.env",
		"/.git/config",
		"/wp-login.php",
		"/admin/",
		"/phpinfo.php",
		"/server-status",
		"/.vscode/sftp.json",
	],
	"crowdsecurity/http-crawl-non_statics": [
		"/0.php",
		"/ms-edit.php",
		"/wp-blog.php",
		"/ya.php",
		"/grsiuk.php",
		"/wp-access.php",
	],
	"crowdsecurity/http-bad-user-agent": ["/", "/robots.txt", "/sitemap.xml"],
	"crowdsecurity/http-sensitive-files": [
		"/.env.bak",
		"/config.json",
		"/backup.sql",
		"/.aws/credentials",
		"/docker-compose.yml",
	],
	"crowdsecurity/CVE-2017-9841": [
		"/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php",
		"/lib/phpunit/src/Util/PHP/eval-stdin.php",
		"/vendor/phpunit/src/Util/PHP/eval-stdin.php",
	],
	"crowdsecurity/http-path-traversal-probing": [
		"/../../etc/passwd",
		"/..%2f..%2f..%2fetc%2fpasswd",
		"/cgi-bin/.%2e/.%2e/etc/passwd",
	],
};

const USER_AGENTS = [
	"Mozilla/5.0 (compatible; Nmap Scripting Engine)",
	"python-requests/2.31.0",
	"curl/8.5.0",
	"Go-http-client/1.1",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
];

const SSH_USERS = [
	"root",
	"admin",
	"ubuntu",
	"oracle",
	"postgres",
	"git",
	"deploy",
	"test",
	"pi",
	"ftpuser",
];
const SCAN_PORTS = [
	"tcp:22",
	"tcp:23",
	"tcp:445",
	"tcp:3389",
	"tcp:5900",
	"tcp:1433",
	"tcp:3306",
	"tcp:8080",
	"udp:161",
];
const ROUTERS = [
	"traefik-websecure@docker",
	"api@internal",
	"dashboard@docker",
	"nextcloud@docker",
];
const DURATIONS = ["4h", "4h13m2s", "24h", "48h", "168h"];

function mulberry32(seed: number) {
	let a = seed;
	return () => {
		a = Math.trunc(a);
		a = Math.trunc(a + 0x6d2b79f5);
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const rand = mulberry32(20260920);
const pick = <T>(items: readonly T[]): T =>
	items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) =>
	min + Math.floor(rand() * (max - min + 1));

function weightedScenario() {
	const total = SCENARIOS.reduce((sum, s) => sum + s.weight, 0);
	let roll = rand() * total;
	for (const scenario of SCENARIOS) {
		roll -= scenario.weight;
		if (roll <= 0) return scenario;
	}
	return SCENARIOS[0];
}

function makeIp(used: Set<string>): string {
	for (;;) {
		const block = pick(IP_BLOCKS);
		const tail = Array.from({ length: block.octets }, () =>
			between(1, 254),
		).join(".");
		const ip = `${block.prefix}.${tail}`;
		if (!used.has(ip)) {
			used.add(ip);
			return ip;
		}
	}
}

function parseDurationHours(duration: string): number {
	const hours = /(\d+)h/.exec(duration);
	return hours ? Number(hours[1]) : 1;
}

const meta = (pairs: Record<string, string | number | undefined>) =>
	Object.entries(pairs)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => ({ key, value: String(value) }));

function buildEvents(
	family: Family,
	scenario: string,
	ip: string,
	network: (typeof NETWORKS)[number],
	at: Date,
) {
	const count = family === "pf" ? between(6, 40) : between(3, 9);
	const common = {
		source_ip: ip,
		ASNNumber: network.asNumber,
		ASNOrg: network.asName,
		IsoCode: network.country,
		IsInEU: ["DE", "NL", "FR"].includes(network.country) ? "true" : "false",
	};

	return Array.from({ length: count }, (_, index) => {
		const timestamp = new Date(
			at.getTime() + index * between(200, 4000),
		).toISOString();
		if (family === "http") {
			const paths =
				HTTP_PATHS[scenario] ?? HTTP_PATHS["crowdsecurity/http-probing"];
			return {
				timestamp,
				meta: meta({
					...common,
					timestamp,
					log_type: "http_access-log",
					http_verb: rand() < 0.82 ? "GET" : pick(["POST", "HEAD"]),
					http_path: paths[index % paths.length],
					http_status: rand() < 0.75 ? 404 : pick([403, 401, 200, 301]),
					http_user_agent: pick(USER_AGENTS),
					traefik_router_name: pick(ROUTERS),
					datasource_path: "/var/log/traefik/access.log",
				}),
			};
		}
		if (family === "ssh") {
			return {
				timestamp,
				meta: meta({
					...common,
					timestamp,
					log_type: "ssh_auth",
					ssh_user: pick(SSH_USERS),
					service: "sshd",
					datasource_path: "/var/log/auth.log",
				}),
			};
		}
		return {
			timestamp,
			meta: meta({
				...common,
				timestamp,
				log_type: "pf_drop",
				iface: pick(["igc0", "vtnet0"]),
				rulenr: String(between(1, 24)),
				ruleid: String(between(100000, 999999)),
				machine: "opnsense.lan",
				service: "pf",
				datasource_path: "/var/log/filter/latest.log",
			}),
		};
	});
}

async function wipe() {
	await prisma.decision.deleteMany();
	await prisma.alert.deleteMany();
	await prisma.host.deleteMany();
	await prisma.session.deleteMany();
	await prisma.account.deleteMany();
	await prisma.user.deleteMany();
	await prisma.verification.deleteMany();
}

async function seedUsers() {
	await createUserAccount(
		DEMO_LOGIN.username,
		DEMO_LOGIN.password,
		"admin@local.internal",
	);
	await createUserAccount("oliver", "crowdsec-demo", "oliver@local.internal");
	// The oldest account is the owner, and every row saying "a few seconds ago" reads like a fresh install
	await prisma.user.update({
		where: { username: DEMO_LOGIN.username },
		data: { createdAt: new Date(Date.now() - 96 * 86_400_000) },
	});
	await prisma.user.update({
		where: { username: "oliver" },
		data: { createdAt: new Date(Date.now() - 31 * 86_400_000) },
	});

	const ssoId = randomUUID();
	await prisma.user.create({
		data: {
			id: ssoId,
			name: "monitoring",
			email: "monitoring@example.com",
			username: "monitoring",
			displayUsername: "monitoring",
			createdAt: new Date(Date.now() - 9 * 86_400_000),
		},
	});
	await prisma.account.create({
		data: {
			id: randomUUID(),
			userId: ssoId,
			accountId: ssoId,
			providerId: "oidc",
		},
	});
}

async function seedDecisions() {
	const now = Date.now();
	const usedIps = new Set<string>();
	const hosts = Array.from({ length: HOST_COUNT }, () => ({
		ip: makeIp(usedIps),
		network: pick(NETWORKS),
		firstSeen: now,
		lastSeen: 0,
		bans: 0,
	}));

	let decisionId = 100_000;
	let alertId = 900_000;

	type Host = (typeof hosts)[number];
	type Scenario = { name: string; family: Family };

	async function addDecision(
		host: Host,
		scenario: Scenario,
		duration: string,
		createdAt: Date,
		active: boolean,
		type: DecisionType = rand() < 0.88 ? "ban" : "captcha",
	) {
		const expiresAt = new Date(
			createdAt.getTime() + parseDurationHours(duration) * 3_600_000,
		);
		host.firstSeen = Math.min(host.firstSeen, createdAt.getTime());
		host.lastSeen = Math.max(host.lastSeen, createdAt.getTime());
		host.bans += 1;

		const events = buildEvents(
			scenario.family,
			scenario.name,
			host.ip,
			host.network,
			createdAt,
		);
		const ports =
			scenario.family === "pf"
				? [
						...new Set(
							Array.from({ length: between(3, 9) }, () => pick(SCAN_PORTS)),
						),
					]
				: [];
		const rawAlert = {
			events,
			meta: ports.length
				? [{ key: "dst_port", value: JSON.stringify(ports) }]
				: [],
		} as unknown as CrowdSecAlert;
		const { entries, entryType } = extractAlertData(rawAlert);

		await prisma.host.upsert({
			where: { ip: host.ip },
			create: {
				ip: host.ip,
				firstSeen: createdAt,
				lastSeen: createdAt,
				country: host.network.country,
				asNumber: host.network.asNumber,
				asName: host.network.asName,
			},
			update: {},
		});

		await prisma.alert.create({
			data: {
				id: alertId,
				scenario: scenario.name,
				message: `Ip ${host.ip} performed '${scenario.name}' (${events.length} events over ${between(2, 90)}s)`,
				createdAt,
				hostIp: host.ip,
				entries: JSON.stringify(entries),
				entryType,
				events: JSON.stringify(events),
			},
		});

		await prisma.decision.create({
			data: {
				id: decisionId,
				hostIp: host.ip,
				type,
				origin: rand() < 0.9 ? "crowdsec" : "cscli",
				scenario: scenario.name,
				duration,
				createdAt,
				expiresAt,
				active,
				alerts: { connect: { id: alertId } },
			},
		});

		const id = decisionId;
		decisionId++;
		alertId++;
		return { id, entryType };
	}

	for (let i = 0; i < DECISION_COUNT; i++) {
		// Every host gets a first decision before any host gets a second one.
		const host =
			i < hosts.length ? hosts[i] : hosts[Math.floor(rand() * hosts.length)];
		const scenario = weightedScenario();
		const duration = pick(DURATIONS);
		const durationHours = parseDurationHours(duration);
		const active = rand() < 0.55;
		// Active stays inside its window, half an hour old at least, leaving the newest rows to the showcase
		const window = Math.min(durationHours, DAYS_OF_HISTORY * 24) * 0.9;
		const ageHours = active
			? 0.5 + rand() * Math.max(window - 0.5, 0.1)
			: durationHours + rand() * DAYS_OF_HISTORY * 24;
		await addDecision(
			host,
			scenario,
			duration,
			new Date(now - ageHours * 3600_000),
			active,
		);
	}

	// Newest-first under the default sort, so these land on page one for the expanded-row scenes
	const featured: Record<string, { id: number; ip: string }> = {};
	const showcase: Scenario[] = [
		{ name: "crowdsecurity/http-crawl-non_statics", family: "http" },
		{ name: "firewallservices/pf-scan-multi_ports", family: "pf" },
		{ name: "crowdsecurity/ssh-bf", family: "ssh" },
	];
	for (const [index, scenario] of showcase.entries()) {
		const { id, entryType } = await addDecision(
			hosts[index],
			scenario,
			"4h",
			new Date(now - index * 60_000),
			true,
			"ban",
		);
		featured[entryType] = { id, ip: hosts[index].ip };
	}

	for (const host of hosts) {
		await prisma.host.update({
			where: { ip: host.ip },
			data: {
				firstSeen: new Date(host.firstSeen),
				lastSeen: new Date(host.lastSeen),
				totalBans: host.bans,
			},
		});
	}

	return featured;
}

async function main() {
	const dbPath = env.DATABASE_URL.replace(/^file:/, "");
	if (!dbPath.includes(".demo")) {
		throw new Error(
			`Refusing to seed ${env.DATABASE_URL}: demo data only goes in .demo/`,
		);
	}
	mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

	await wipe();
	await seedUsers();
	const featured = await seedDecisions();

	const manifest = { login: DEMO_LOGIN, featured };
	writeFileSync(
		path.join(path.dirname(path.resolve(dbPath)), "manifest.json"),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);

	const [decisions, active, hosts, users] = await Promise.all([
		prisma.decision.count(),
		prisma.decision.count({ where: { active: true } }),
		prisma.host.count(),
		prisma.user.count(),
	]);
	console.log(
		`Seeded ${decisions} decisions (${active} active), ${hosts} hosts, ${users} users`,
	);
	await prisma.$disconnect();
}

await main();

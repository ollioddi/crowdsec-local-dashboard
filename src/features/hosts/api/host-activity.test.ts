import { describe, expect, it } from "vitest";
import dovecot from "@/common/parsing/fixtures/mailcow-dovecot.json";
import postscreen from "@/common/parsing/fixtures/mailcow-postscreen.json";
import { alertDetailFromRow } from "@/features/decisions/api/alert-detail";
import { pfRow } from "@/features/decisions/api/alert-detail.fixture";
import {
	type ActivityDecision,
	buildHostActivity,
	observedValues,
} from "./host-activity";

const alert = alertDetailFromRow(pfRow);
const decision: ActivityDecision = {
	id: 1,
	scenario: alert.scenario,
	active: true,
	simulated: false,
	origin: "crowdsec",
	createdAt: alert.createdAt,
};

describe("host activity", () => {
	it("counts shared alerts once while counting decisions and simulation separately", () => {
		const result = buildHostActivity(
			[
				decision,
				{ ...decision, id: 2, simulated: true },
				{ ...decision, id: 3, active: false },
			],
			[alert, alert],
		);
		expect(result.alertCount).toBe(1);
		expect(result.scenarios[0]).toMatchObject({
			alertCount: 1,
			decisionCount: 3,
			activeCount: 1,
			simulatedCount: 1,
			agents: ["opnsense"],
		});
		expect(
			result.targets.find((group) => group.label === "Destination ports")
				?.values,
		).toContainEqual({ value: "tcp:3389", alertCount: 1 });
	});
	it("deduplicates repeated values within each alert, including aggregate overlaps", () => {
		const event = {
			...alert.events[0],
			fields: { kind: "traefik-http" as const, path: "/.env" },
			facets: { target: { fqdn: "mail.example.com", uri: "/.env" } },
		};
		const http = {
			...alert,
			events: [event, event],
			aggregates: {
				kind: "traefik-http" as const,
				targetUris: ["/.env", "/admin"],
			},
		};
		const result = buildHostActivity([], [http, { ...http, id: 2 }]);
		expect(
			result.targets.find((group) => group.label === "Requested paths")?.values,
		).toEqual([
			{ value: "/.env", alertCount: 2 },
			{ value: "/admin", alertCount: 2 },
		]);
		expect(
			result.targets.find((group) => group.label === "Requested domains")
				?.values,
		).toEqual([{ value: "mail.example.com", alertCount: 2 }]);
	});
	it("retains decisions without local evidence and sorts by latest occurrence", () => {
		const manual = {
			...decision,
			id: 2,
			scenario: "manual",
			origin: "cscli",
			createdAt: new Date("2026-09-23"),
		};
		const result = buildHostActivity([manual, decision], [alert]);
		expect(result.scenarios[0]).toMatchObject({
			scenario: "manual",
			alertCount: 0,
			origins: ["cscli"],
		});
		expect(buildHostActivity([], []).scenarios).toEqual([]);
	});
	it("aggregates all retained history and dates scenarios from their latest occurrence", () => {
		const alerts = Array.from({ length: 7 }, (_, i) => ({
			...alert,
			id: i,
			createdAt: new Date(2026, 8, i + 1),
		}));
		const result = buildHostActivity([], alerts);
		expect(result.scenarios[0].latestAt).toEqual(new Date(2026, 8, 7));
		expect(result.scenarios[0].alertCount).toBe(7);
		expect(result.targets[0].values[0].alertCount).toBe(7);
	});
	it("reuses the mailcow parser for context-only accounts and postscreen violations", () => {
		const mail = alertDetailFromRow({
			...pfRow,
			events: JSON.stringify(dovecot.events),
			meta: JSON.stringify({
				target_user: '["info@example.com","admin@example.com"]',
				login_message: '["Password mismatch"]',
			}),
		});
		expect(
			observedValues(mail)["Attempted mail accounts"]?.length,
		).toBeGreaterThan(0);
		expect(
			observedValues(
				alertDetailFromRow({
					...pfRow,
					events: JSON.stringify(postscreen.events),
					meta: "{}",
				}),
			)["Mail rejections"]?.length,
		).toBeGreaterThan(0);
	});
	it("uses newest known enrichment and treats AS0 as unknown", () => {
		const older = {
			...alert,
			id: 2,
			createdAt: new Date("2026-09-21"),
			events: [
				{
					...alert.events[0],
					facets: { geo: { asnNumber: "123", asnOrg: "Example" } },
				},
			],
		};
		const newer = {
			...alert,
			events: [
				{
					...alert.events[0],
					facets: { geo: { asnNumber: "0", isoCode: "DK" } },
				},
			],
		};
		expect(buildHostActivity([], [older, newer]).network).toMatchObject({
			asNumber: "123",
			asName: "Example",
			country: "DK",
		});
	});
	it("bounds target payloads while reporting the full number of distinct values", () => {
		const ports = Array.from({ length: 30 }, (_, i) => `tcp:${i}`);
		const result = buildHostActivity(
			[],
			[
				{
					...alert,
					entries: ports,
					aggregates: { kind: "opnsense-pf", dstPorts: ports },
				},
			],
		);
		expect(result.targets[0].total).toBe(30);
		expect(result.targets[0].values).toHaveLength(20);
	});
});

import { describe, expect, it } from "vitest";
import { alertDetailFromRow } from "@/features/decisions/api/alert-detail";
import { pfRow } from "@/features/decisions/api/alert-detail.fixture";
import { collectDetails, collectUnparsed } from "./details";

describe("collectDetails", () => {
	const detail = alertDetailFromRow(pfRow);

	it("leaves out what the header, the lines and the facts column show", () => {
		const details = collectDetails(detail);
		expect(details).not.toHaveProperty("machine id");
		expect(details).not.toHaveProperty("uuid");
		expect(details).not.toHaveProperty("capacity");
		expect(details).not.toHaveProperty("dst ports");
		expect(details).not.toHaveProperty("country code");
	});

	it("surfaces a parsed field its renderer does not draw", () => {
		const nothingDrawn = collectDetails(detail, undefined, () => new Set());
		expect(nothingDrawn.interface).toBe("em0");
		const drawn = collectDetails(
			detail,
			undefined,
			() => new Set(["interface"]),
		);
		expect(drawn).not.toHaveProperty("interface");
	});

	it("repeats the source ip only when it is not the decision's own", () => {
		const withIp = alertDetailFromRow({
			...pfRow,
			events: JSON.stringify([
				{ meta: [{ key: "source_ip", value: "37.120.148.140" }] },
			]),
		});
		expect(collectDetails(withIp, "37.120.148.140")).not.toHaveProperty(
			"source ip",
		);
		expect(collectDetails(withIp, "37.120.144.0/20")["source ip"]).toBe(
			"37.120.148.140",
		);
	});
});

describe("collectUnparsed", () => {
	it("lists the keys no parser claimed", () => {
		expect(collectUnparsed(alertDetailFromRow(pfRow))).toEqual({
			some_future_key: "value",
		});
	});
});

describe("evidence not present in retained events", () => {
	it("keeps aggregate-only rule names and user agents visible", () => {
		const detail = alertDetailFromRow(pfRow);
		detail.aggregates = { kind: "appsec", rules: ["extra-rule"] };
		detail.facets.client = { userAgents: ["scanner/1.0"] };
		expect(collectDetails(detail)).toMatchObject({
			rules: "extra-rule",
			"user agents": "scanner/1.0",
		});
	});
	it("leaves Dovecot aggregates to the Dovecot box", () => {
		const detail = alertDetailFromRow(pfRow);
		detail.aggregates = {
			kind: "dovecot",
			mailboxes: ["info@example.com"],
			protocols: ["imap"],
			loginMessages: ["Password mismatch"],
		};
		const details = collectDetails(detail);
		expect(details).not.toHaveProperty("mailboxes");
		expect(details).not.toHaveProperty("protocols");
		expect(details).not.toHaveProperty("login messages");
	});
	it("leaves Postfix aggregates to the Postfix box", () => {
		const detail = alertDetailFromRow(pfRow);
		detail.aggregates = {
			kind: "postfix",
			clientSent: ["EHLO User"],
			lostAfter: ["AUTH"],
			commands: ["GET / HTTP/1.1"],
		};
		const details = collectDetails(detail);
		expect(details).not.toHaveProperty("client sent");
		expect(details).not.toHaveProperty("lost after");
		expect(details).not.toHaveProperty("commands");
	});
	it("keeps a target visible for sources without a request line", () => {
		const detail = alertDetailFromRow(pfRow);
		detail.events[0].facets.target = {
			fqdn: "firewall.example",
			uri: "/probe",
		};
		expect(collectDetails(detail)).toMatchObject({
			"target fqdn": "firewall.example",
			"target uri": "/probe",
		});
	});
});

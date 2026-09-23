import { describe, expect, it } from "vitest";
import type { CrowdSecAlert } from "@/common/crowdsec-lapi/types";
import { decodeAlertRow, encodeAlertRow } from "./alert-row";

/** A pf alert as LAPI returns it, trimmed to what the codec reads. */
const lapiAlert: CrowdSecAlert = {
	id: 42,
	scenario: "firewallservices/pf-scan-multi_ports",
	message: "Ip 37.120.148.140 performed 'firewallservices/pf-scan-multi_ports'",
	events_count: 12,
	start_at: "2026-09-22T04:22:18Z",
	stop_at: "2026-09-22T04:22:20Z",
	created_at: "2026-09-22T04:22:20Z",
	source: { scope: "Ip", value: "37.120.148.140", range: "37.120.144.0/20" },
	meta: [{ key: "dst_port", value: '["tcp:3389","tcp:445"]' }],
	events: [
		{
			timestamp: "2026-09-22T04:22:18Z",
			meta: [
				{ key: "log_type", value: "pf_drop" },
				{ key: "iface", value: "em0" },
			],
		},
	],
	decisions: [],
	machine_id: "opnsense",
	capacity: 5,
	leakspeed: "",
};

describe("encodeAlertRow", () => {
	const row = encodeAlertRow(lapiAlert);

	it("precomputes the queryable columns from the parser", () => {
		expect(row).toMatchObject({
			integration: "opnsense-pf",
			entryType: "ports",
			entries: '["tcp:3389","tcp:445"]',
		});
	});

	it("copies provenance, with LAPI's empty leakspeed stored as null", () => {
		expect(row).toMatchObject({
			machineId: "opnsense",
			capacity: 5,
			leakspeed: null,
			sourceScope: "Ip",
			sourceRange: "37.120.144.0/20",
			simulated: false,
		});
	});

	it("round-trips the raw bags through the stored JSON", () => {
		expect(decodeAlertRow({ id: 42, ...row })).toEqual({
			events: lapiAlert.events,
			meta: lapiAlert.meta,
		});
	});
});

describe("decodeAlertRow", () => {
	it("returns null for unreadable JSON instead of throwing", () => {
		expect(
			decodeAlertRow({ id: 1, events: "not json", meta: "{}" }),
		).toBeNull();
	});
});

describe("invalid stored shapes", () => {
	it.each([
		"null",
		"{}",
		'[{"meta":null}]',
		'[{"meta":[{"key":"x","value":42}]}]',
	])("rejects event JSON %s", (events) => {
		expect(decodeAlertRow({ id: 1, events, meta: "{}" })).toBeNull();
	});
	it("rejects non-string alert metadata", () => {
		expect(
			decodeAlertRow({ id: 1, events: "[]", meta: '{"dst_port":443}' }),
		).toBeNull();
	});
});

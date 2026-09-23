import { describe, expect, it } from "vitest";
import { alertDetailFromRow } from "./alert-detail";
import { pfRow } from "./alert-detail.fixture";

describe("alertDetailFromRow", () => {
	const detail = alertDetailFromRow(pfRow);

	it("re-parses the stored bags rather than trusting precomputed columns", () => {
		expect(detail.integration).toBe("opnsense-pf");
		expect(detail.entries).toEqual(["tcp:3389", "tcp:445"]);
		// LAPI sends no event id; "event n of alert X" is minted here for the UI
		expect(detail.events[0]?.id).toBe("1-0");
		expect(detail.events[0]?.fields).toMatchObject({
			kind: "opnsense-pf",
			action: "drop",
			interface: "em0",
		});
	});

	it("takes provenance straight from the columns", () => {
		expect(detail.provenance).toEqual({
			machineId: "opnsense",
			uuid: "6f0b1f3e",
			scenarioVersion: "0.3",
			capacity: 5,
			leakspeed: null,
			simulated: false,
			remediation: true,
			sourceScope: "Ip",
			sourceRange: "37.120.144.0/20",
		});
	});

	it("falls back to the parsed event count when LAPI sent none", () => {
		expect(detail.eventsCount).toBe(12);
		expect(
			alertDetailFromRow({ ...pfRow, eventsCount: null }).eventsCount,
		).toBe(1);
	});

	it("renders an unreadable row as an alert with no events, not a crash", () => {
		const broken = alertDetailFromRow({ ...pfRow, events: "not json" });
		expect(broken.events).toEqual([]);
		expect(broken.integration).toBe("unknown");
		expect(broken.provenance.machineId).toBe("opnsense");
	});
});

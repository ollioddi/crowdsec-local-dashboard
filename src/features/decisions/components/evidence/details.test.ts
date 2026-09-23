import { describe, expect, it } from "vitest";
import { alertDetailFromRow } from "@/features/decisions/api/alert-detail";
import { pfRow } from "@/features/decisions/api/alert-detail.fixture";
import { collectDetails, collectUnparsed } from "./details";

describe("collectDetails", () => {
	const details = collectDetails(alertDetailFromRow(pfRow));

	it("labels geo and provenance the headline box has no room for", () => {
		expect(details["country code"]).toBe("ES");
		expect(details.uuid).toBe("6f0b1f3e");
		expect(details["scenario version"]).toBe("0.3");
	});

	it("leaves out what the headline box already shows", () => {
		expect(details).not.toHaveProperty("machine id");
		expect(details).not.toHaveProperty("capacity");
	});

	it("flattens the integration's aggregate", () => {
		expect(details["dst ports"]).toBe("tcp:3389, tcp:445");
	});
});

describe("collectUnparsed", () => {
	it("lists the keys no parser claimed", () => {
		expect(collectUnparsed(alertDetailFromRow(pfRow))).toEqual({
			some_future_key: "value",
		});
	});
});

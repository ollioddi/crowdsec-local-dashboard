import { describe, expect, it } from "vitest";
import { groupPfEvents } from "./pf-groups";
import type { EventOf } from "./shared";

function pf(
	id: string,
	fields: Partial<EventOf<"opnsense-pf">["fields"]>,
	timestamp: string | null,
): EventOf<"opnsense-pf"> {
	return {
		id,
		integration: "opnsense-pf",
		timestamp: timestamp ? new Date(timestamp) : null,
		fields: { kind: "opnsense-pf", ...fields },
		facets: {},
		unparsed: {},
	};
}

describe("groupPfEvents", () => {
	it("folds repeats and keeps the span of each group", () => {
		const groups = groupPfEvents([
			pf("1", { interface: "em0", protocol: "tcp" }, "2026-09-22T04:22:20Z"),
			pf("2", { interface: "em0", protocol: "tcp" }, "2026-09-22T04:22:18Z"),
			pf("3", { interface: "em1", protocol: "tcp" }, "2026-09-22T04:22:19Z"),
		]);
		expect(groups).toHaveLength(2);
		expect(groups[0].count).toBe(2);
		expect(groups[0].first?.toISOString()).toBe("2026-09-22T04:22:18.000Z");
		expect(groups[0].last?.toISOString()).toBe("2026-09-22T04:22:20.000Z");
		expect(groups[1].fields.interface).toBe("em1");
	});

	it("tolerates events without a timestamp", () => {
		const [group] = groupPfEvents([
			pf("1", { interface: "em0" }, null),
			pf("2", { interface: "em0" }, "2026-09-22T04:22:18Z"),
		]);
		expect(group.count).toBe(2);
		expect(group.first?.toISOString()).toBe("2026-09-22T04:22:18.000Z");
	});
});

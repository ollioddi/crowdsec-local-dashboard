import { expect, it } from "vitest";
import { decisionIdSchema } from "./decisions.functions";

it("accepts only positive integer decision ids", () => {
	expect(decisionIdSchema.safeParse(42).success).toBe(true);
	for (const id of [0, -5, 1.5, Number.NaN, 1e21]) {
		expect(decisionIdSchema.safeParse(id).success).toBe(false);
	}
});

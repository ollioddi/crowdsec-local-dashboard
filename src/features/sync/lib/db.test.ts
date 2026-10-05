import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
	decision: { findMany: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/common/lib/db", () => ({ prisma: db }));

import { BATCH_SIZE, deactivateStaleDecisions } from "./db";

beforeEach(() => vi.clearAllMocks());

describe("full sync stale decision reconciliation", () => {
	it("handles more than SQLite's bind limit and only deactivates missing IDs", async () => {
		const kept = Array.from({ length: 1500 }, (_, i) => i + 1);
		const stale = Array.from({ length: 1200 }, (_, i) => i + 1501);
		db.decision.findMany.mockResolvedValue(
			[...kept, ...stale].map((id) => ({ id })),
		);
		db.decision.updateMany.mockImplementation(async ({ where }) => ({
			count: where.id.in.length,
		}));
		expect(await deactivateStaleDecisions(kept)).toBe(stale.length);
		const batches = db.decision.updateMany.mock.calls.map(
			([args]) => args.where.id.in,
		);
		expect(batches.flat()).toEqual(stale);
		expect(batches.every((batch) => batch.length <= BATCH_SIZE)).toBe(true);
		expect(db.decision.findMany).toHaveBeenCalledWith({
			where: { active: true },
			select: { id: true },
		});
	});
	it("deactivates everything when the full stream contains no active decisions", async () => {
		db.decision.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
		db.decision.updateMany.mockResolvedValue({ count: 2 });
		expect(await deactivateStaleDecisions([])).toBe(2);
	});
	it("does not write when all stored decisions are still active", async () => {
		db.decision.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
		expect(await deactivateStaleDecisions([1, 2])).toBe(0);
		expect(db.decision.updateMany).not.toHaveBeenCalled();
	});
});

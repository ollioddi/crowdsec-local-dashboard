import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ user: { count: vi.fn() } }));
vi.mock("@/common/lib/db", () => ({ prisma: db }));

import { announceSetupCode, claimSetupCode } from "./setup-code.server";

beforeEach(() => {
	globalThis.__setupCode = undefined;
	db.user.count.mockResolvedValue(0);
});

describe("setup code", () => {
	it("lets exactly one claim through", async () => {
		await announceSetupCode();
		const code = globalThis.__setupCode as string;
		expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
		expect(claimSetupCode(code)).not.toBeNull();
		expect(claimSetupCode(code)).toBeNull();
	});

	it("accepts the code in lowercase and without dashes", async () => {
		await announceSetupCode();
		const code = (globalThis.__setupCode as string).toLowerCase();
		expect(claimSetupCode(code.replaceAll("-", ""))).not.toBeNull();
	});

	it("rejects a wrong code and keeps the real one", async () => {
		await announceSetupCode();
		expect(claimSetupCode("AAAA-AAAA-AAAA")).toBeNull();
		expect(claimSetupCode(globalThis.__setupCode as string)).not.toBeNull();
	});

	it("puts the code back when setup fails afterwards", async () => {
		await announceSetupCode();
		const code = globalThis.__setupCode as string;
		claimSetupCode(code)?.();
		expect(claimSetupCode(code)).not.toBeNull();
	});

	it("issues no code once an account exists", async () => {
		db.user.count.mockResolvedValue(1);
		await announceSetupCode();
		expect(claimSetupCode("")).toBeNull();
	});
});

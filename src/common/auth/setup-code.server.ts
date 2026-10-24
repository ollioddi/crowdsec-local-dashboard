import { randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/common/lib/db";
import { logger } from "@/common/lib/logging/logger";

declare global {
	// Kept across dev reloads
	var __setupCode: string | null | undefined;
}

const log = logger("setup");

// No look-alike characters (0/O, 1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUPS = 3;
const GROUP_LENGTH = 4;

function generateCode(): string {
	const groups: string[] = [];
	for (let g = 0; g < GROUPS; g++) {
		let group = "";
		for (let i = 0; i < GROUP_LENGTH; i++) {
			group += ALPHABET[randomInt(ALPHABET.length)];
		}
		groups.push(group);
	}
	return groups.join("-");
}

function normalize(code: string): string {
	return code
		.trim()
		.toUpperCase()
		.replaceAll(/[^A-Z0-9]/g, "");
}

/** At boot, logs a setup code if no account exists. */
export async function announceSetupCode(): Promise<void> {
	if ((await prisma.user.count()) > 0) {
		globalThis.__setupCode = null;
		return;
	}
	globalThis.__setupCode ??= generateCode();
	log.warn(
		"No account exists yet. Create the first one on the login page with setup code {code}",
		{ code: globalThis.__setupCode },
	);
}

/** Checks and uses up the code. Returns a function that restores it, or null if wrong. */
export function claimSetupCode(input: string): (() => void) | null {
	const code = globalThis.__setupCode;
	if (!code) return null;
	const expected = Buffer.from(normalize(code));
	const given = Buffer.from(normalize(input));
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
		return null;
	}
	globalThis.__setupCode = null;
	return () => {
		globalThis.__setupCode = code;
	};
}

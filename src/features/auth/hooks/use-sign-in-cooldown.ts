import { useEffect, useState } from "react";

// In sessionStorage, so a reload keeps the countdown
const STORAGE_KEY = "sign-in-retry-at";

function readRetryAt(): number | null {
	try {
		const stored = Number(sessionStorage.getItem(STORAGE_KEY));
		return stored > Date.now() ? stored : null;
	} catch {
		return null;
	}
}

function writeRetryAt(retryAt: number | null) {
	try {
		if (retryAt === null) sessionStorage.removeItem(STORAGE_KEY);
		else sessionStorage.setItem(STORAGE_KEY, String(retryAt));
	} catch {
		// Storage blocked: the countdown still works without it
	}
}

/** Seconds until sign-in can be tried again. */
export function useSignInCooldown() {
	const [retryAt, setRetryAt] = useState<number | null>(null);
	const [now, setNow] = useState(() => Date.now());

	// After hydration, since the server has no sessionStorage
	useEffect(() => {
		setRetryAt(readRetryAt());
		setNow(Date.now());
	}, []);

	useEffect(() => {
		if (retryAt === null) return;
		const timer = setInterval(() => {
			const current = Date.now();
			setNow(current);
			if (current >= retryAt) {
				writeRetryAt(null);
				setRetryAt(null);
			}
		}, 1_000);
		return () => clearInterval(timer);
	}, [retryAt]);

	const start = (until: number) => {
		writeRetryAt(until);
		setNow(Date.now());
		setRetryAt(until);
	};

	const secondsLeft =
		retryAt === null ? 0 : Math.max(0, Math.ceil((retryAt - now) / 1000));
	return { secondsLeft, start };
}

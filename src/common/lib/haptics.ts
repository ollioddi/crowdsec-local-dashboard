/** Short vibration. No-ops where the Vibration API is missing (iOS, desktop). */
export function haptic(pattern: number | number[] = 12): void {
	try {
		navigator.vibrate?.(pattern);
	} catch {
		// Some browsers throw when the document has never been interacted with
	}
}

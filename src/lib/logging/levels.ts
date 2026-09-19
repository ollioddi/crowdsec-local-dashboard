/** Most severe first. `debug` is the parts work is made of; `trace` is detail within one part. */
export const LOG_LEVELS = [
	"fatal",
	"error",
	"warn",
	"info",
	"debug",
	"trace",
] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** OpenTelemetry severity numbers, so JSON lines sort and filter by number. */
export const SEVERITY_NUMBERS: Record<LogLevel, number> = {
	fatal: 21,
	error: 17,
	warn: 13,
	info: 9,
	debug: 5,
	trace: 1,
};

export function isLevelEnabled(level: LogLevel, threshold: LogLevel): boolean {
	return SEVERITY_NUMBERS[level] >= SEVERITY_NUMBERS[threshold];
}

export const LOG_FORMATS = ["human", "json"] as const;
export type LogFormat = (typeof LOG_FORMATS)[number];

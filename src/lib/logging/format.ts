import { type LogLevel, SEVERITY_NUMBERS } from "./levels";

export type Fields = Record<string, unknown>;

/** One finished line, before it is rendered for a destination. */
export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	logger: string;
	message: string;
	fields: Fields;
	/** Field keys the message already states, left off the human line. */
	consumed: string[];
}

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const TIMESTAMP = "\x1b[38;5;247m";

const LEVEL_COLORS: Record<LogLevel, string> = {
	fatal: "\x1b[1;97;41m",
	error: "\x1b[1;38;5;196m",
	warn: "\x1b[1;38;5;214m",
	info: "\x1b[38;5;40m",
	debug: "\x1b[38;5;244m",
	trace: "\x1b[38;5;240m",
};

/** Per-logger hues, kept clear of the level hues above. */
const LOGGER_COLORS = [
	"\x1b[38;5;209m",
	"\x1b[38;5;111m",
	"\x1b[38;5;170m",
	"\x1b[38;5;80m",
	"\x1b[38;5;186m",
	"\x1b[38;5;105m",
	"\x1b[38;5;215m",
	"\x1b[38;5;117m",
	"\x1b[38;5;218m",
	"\x1b[38;5;153m",
	"\x1b[38;5;150m",
];

/** Stable per name, so one module keeps one color for the life of the stream. */
function colorForLogger(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash * 31 + (name.codePointAt(i) ?? 0)) >>> 0;
	}
	return LOGGER_COLORS[hash % LOGGER_COLORS.length];
}

/** https://no-color.org: any non-empty value turns color off, `0` included. */
export function isColorEnabled(): boolean {
	return !process.env.NO_COLOR;
}

export function formatJson(entry: LogEntry): string {
	return JSON.stringify({
		timestamp: entry.timestamp,
		level: entry.level,
		severity: SEVERITY_NUMBERS[entry.level],
		logger: entry.logger,
		message: entry.message,
		...entry.fields,
	});
}

/**
 * ```text
 * 2026-09-19 21:03:52.819 info  [lapi-sync] Synced 12 new decisions  hosts=3 durationMs=412
 * ```
 * Only a stack trace continues onto further lines.
 */
export interface HumanOptions {
	color: boolean;
	/** Stack traces are for debugging; a plain `error` line stays one line without them. */
	stacks: boolean;
}

export function formatHuman(entry: LogEntry, options: HumanOptions): string {
	const paint = (text: string, code: string) =>
		options.color ? `${code}${text}${RESET}` : text;
	const time = paint(humanTime(entry.timestamp), TIMESTAMP);
	const level = paint(entry.level.padEnd(5), LEVEL_COLORS[entry.level]);
	const logger = paint(`[${entry.logger}]`, colorForLogger(entry.logger));
	const pairs = renderPairs(
		entry.fields,
		new Set([...entry.consumed, "stack"]),
	);
	const data = pairs ? paint(`  ${pairs}`, DIM) : "";
	const stack =
		options.stacks && typeof entry.fields.stack === "string"
			? `\n${entry.fields.stack}`
			: "";
	return `${time} ${level} ${logger} ${entry.message}${data}${stack}`;
}

function renderPairs(fields: Fields, alreadyShown: Set<string>): string {
	const rendered: string[] = [];
	for (const [key, value] of Object.entries(fields)) {
		if (alreadyShown.has(key)) continue;
		if (value === undefined) continue;
		rendered.push(`${key}=${renderValue(value)}`);
	}
	return rendered.join(" ");
}

/** Quoted only when a string would otherwise run into the next pair. */
export function renderValue(value: unknown): string {
	if (typeof value === "string") {
		return /[\s"]/.test(value) ? JSON.stringify(value) : value;
	}
	const isObject = typeof value === "object" && value !== null;
	return isObject ? JSON.stringify(value) : String(value);
}

const MS_PER_MINUTE = 60_000;

/** `2026-09-19 21:03:52.819` in local time; the JSON shape keeps the UTC instant. */
function humanTime(timestamp: string): string {
	const at = new Date(timestamp);
	const local = new Date(at.getTime() - at.getTimezoneOffset() * MS_PER_MINUTE);
	return local.toISOString().slice(0, 23).replace("T", " ");
}

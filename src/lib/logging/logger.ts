import {
	type Fields,
	formatHuman,
	formatJson,
	isColorEnabled,
	type LogEntry,
	renderValue,
} from "./format";
import {
	isLevelEnabled,
	LOG_LEVELS,
	type LogFormat,
	type LogLevel,
} from "./levels";

/** One method per level. Values go in the second argument, never in the message. */
export type Log = Record<LogLevel, (message: string, fields?: Fields) => void>;

export interface LoggingOptions {
	/** Minimum level written. Default `info`. */
	level?: LogLevel;
	/** `human` for a terminal, `json` for a collector. Default `human`. */
	format?: LogFormat;
	/** Test seam: capture lines instead of writing them to the streams. */
	write?: (line: string, level: LogLevel) => void;
}

const state: Required<LoggingOptions> = {
	level: "info",
	format: "human",
	write: writeToStream,
};

/** Called once at boot. Loggers created earlier pick the settings up on their next call. */
export function initLogging(options: LoggingOptions): void {
	Object.assign(state, options);
}

const loggers = new Map<string, Log>();

/** A logger writing as `[name]`, colored by name. */
export function logger(name: string): Log {
	let log = loggers.get(name);
	if (!log) {
		log = buildLog(name);
		loggers.set(name, log);
	}
	return log;
}

function buildLog(name: string): Log {
	const methods = LOG_LEVELS.map((level) => [
		level,
		(message: string, fields: Fields = {}) =>
			emit(level, name, message, fields),
	]);
	return Object.fromEntries(methods) as Log;
}

function emit(level: LogLevel, name: string, message: string, fields: Fields) {
	if (!isLevelEnabled(level, state.level)) return;
	const { text, filled } = fillTemplate(message, fields);
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		logger: name,
		message: text,
		fields,
		consumed: filled,
	};
	const line =
		state.format === "json"
			? formatJson(entry)
			: formatHuman(entry, {
					color: isColorEnabled(),
					stacks: isLevelEnabled("debug", state.level),
				});
	state.write(line, level);
}

const PLACEHOLDER = /\{(\w+)\}/g;

/** Substitutes `{key}` from the fields. An unmatched placeholder is left standing so the call site can be found. */
function fillTemplate(
	message: string,
	fields: Fields,
): { text: string; filled: string[] } {
	if (!message.includes("{")) return { text: message, filled: [] };
	const filled: string[] = [];
	const text = message.replace(PLACEHOLDER, (placeholder, key: string) => {
		if (fields[key] === undefined) return placeholder;
		filled.push(key);
		return renderInline(fields[key]).replace(/\s+/g, " ").trim();
	});
	return { text, filled };
}

/** Unquoted: the value becomes part of a sentence, not a `key=value` pair. */
function renderInline(value: unknown): string {
	return typeof value === "string" ? value : renderValue(value);
}

const STDERR_LEVELS = new Set<LogLevel>(["fatal", "error", "warn"]);

/** Never `console.*`: the dev server rewrites those as "LOG file:line" blocks. */
function writeToStream(line: string, level: LogLevel): void {
	(STDERR_LEVELS.has(level) ? process.stderr : process.stdout).write(
		`${line}\n`,
	);
}

export type ErrorFields = {
	errorMessage: string;
	errorType?: string;
	stack?: string;
};

/** Fields for a caught `unknown`, for a `{errorMessage}` placeholder. */
export function errorFields(error: unknown): ErrorFields {
	if (!(error instanceof Error)) return { errorMessage: String(error) };
	const cause = error.cause instanceof Error ? `: ${error.cause.message}` : "";
	return {
		errorMessage: `${error.message}${cause}`,
		errorType: error.name,
		stack: error.stack,
	};
}

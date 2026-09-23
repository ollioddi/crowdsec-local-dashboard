import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/common/components/ui/button";
import { useOnline } from "@/common/hooks/use-online";

function isNetworkError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /fetch failed|failed to fetch|load failed|network/i.test(message);
}

/** Route error view: retries by itself when the browser comes back online. */
export function ConnectionError({ error, reset }: ErrorComponentProps) {
	const router = useRouter();
	const online = useOnline();
	const network = isNetworkError(error);

	const retry = () => {
		reset();
		router.invalidate();
	};

	// Retry only when the browser goes from offline to online, never on mount:
	// an unreachable server would otherwise be hammered in a loop
	const wasOffline = useRef(!online);
	// biome-ignore lint/correctness/useExhaustiveDependencies: reacts to the online transition only
	useEffect(() => {
		if (online && wasOffline.current && network) retry();
		wasOffline.current = !online;
	}, [online]);

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
			<WifiOff className="size-8 text-muted-foreground" />
			<div className="space-y-1">
				<h2 className="text-lg font-semibold">
					{online ? "Cannot reach the dashboard" : "You are offline"}
				</h2>
				<p className="max-w-sm text-sm text-muted-foreground">
					{online
						? "The server did not answer. It may be restarting, or something between you and it dropped the request."
						: "This page will load by itself once the connection is back."}
				</p>
				{!network && (
					<p className="max-w-md break-all font-mono text-xs text-muted-foreground">
						{error instanceof Error ? error.message : String(error)}
					</p>
				)}
			</div>
			{online && (
				<Button
					variant="outline"
					size="sm"
					icon={RefreshCw}
					iconPlacement="left"
					onClick={retry}
				>
					Try again
				</Button>
			)}
		</div>
	);
}

/** Route pending view; a paused fetch says what it is waiting for. */
export function ConnectionPending() {
	const online = useOnline();
	return (
		<div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
			{online ? (
				<Loader2 className="size-4 animate-spin" />
			) : (
				<WifiOff className="size-4" />
			)}
			<span>{online ? "Loading" : "Waiting for a connection"}</span>
		</div>
	);
}

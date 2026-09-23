import { WifiOff } from "lucide-react";
import { useOnline } from "@/common/hooks/use-online";

/** One line on every page while the browser is offline; data on screen is what was last loaded. */
export function OfflineBanner() {
	const online = useOnline();
	if (online) return null;
	return (
		<div
			role="status"
			className="flex items-center gap-2 border-b bg-muted px-4 py-1.5 text-xs text-muted-foreground"
		>
			<WifiOff className="size-3.5 shrink-0" />
			<span>
				<span className="font-medium text-foreground">Offline.</span> Showing
				what was last loaded; it updates by itself when the connection is back.
			</span>
		</div>
	);
}

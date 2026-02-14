import { Link } from "@tanstack/react-router";
import { ClipboardCopy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Badge } from "../ui/badge";

export function truncateIp(ip: string): string {
	if (!ip.includes(":")) return ip; // IPv4, no truncation
	// Shorten IPv6: show first two groups and last group
	const parts = ip.split(":");
	if (parts.length <= 3) return ip;
	return `${parts[0]}:${parts[1]}::${parts.at(-1)}`;
}

export function IPCopyBadge({ ip }: Readonly<{ ip: string }>) {
	const [copy, isCopied] = useCopyToClipboard();
	const display = truncateIp(ip);

	const handleCopy = (e: React.MouseEvent) => {
		e.stopPropagation();
		copy(ip);
		toast.success("IP address copied to clipboard");
	};

	return (
		<Badge
			variant="outline"
			className={`cursor-pointer font-mono text-sm${isCopied ? " text-green-500" : ""}`}
			onClick={handleCopy}
			title={ip}
		>
			{display}
			<ClipboardCopy className="ml-1.5 size-3" />
		</Badge>
	);
}

export function IPLinkBadge({ ip }: Readonly<{ ip: string }>) {
	const display = truncateIp(ip);

	return (
		<Badge variant="secondary" className="font-mono text-sm" title={ip} asChild>
			<Link to="/hosts" search={{ hostIp: ip }}>
				{display}
				<ExternalLink className="ml-1.5 size-3" />
			</Link>
		</Badge>
	);
}

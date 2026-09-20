export function LiveIndicator({ connected }: Readonly<{ connected: boolean }>) {
	return (
		<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
			<span
				className={`inline-block size-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
			/>
			{connected ? "Live" : "Disconnected"}
		</div>
	);
}

import { Trash2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { countryFlag } from "@/common/lib/country-flag";
import { haptic } from "@/common/lib/haptics";
import type { DecisionWithHost } from "@/features/decisions/api/decisions.types";
import { shortScenario } from "./columns";

interface DeleteDecisionDialogProps {
	/** The decision awaiting confirmation, or null when the dialog is closed. */
	decision: DecisionWithHost | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (decision: DecisionWithHost) => void;
}

/** One dialog per page, not per row: 500 rows would mount 500 of them. */
export function DeleteDecisionDialog({
	decision,
	onOpenChange,
	onConfirm,
}: Readonly<DeleteDecisionDialogProps>) {
	return (
		<AlertDialog open={decision !== null} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<Trash2 className="size-4 text-destructive" />
						Remove this {decision?.type ?? "decision"}?
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3">
							<p>
								CrowdSec stops enforcing it immediately and{" "}
								<span className="font-medium text-foreground">
									{decision?.hostIp}
								</span>{" "}
								can reach your services again.
							</p>
							{decision && (
								<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border bg-muted/40 p-3 text-xs">
									<dt className="text-muted-foreground">Host</dt>
									<dd className="font-mono">
										{countryFlag(decision.host.country)} {decision.hostIp}
									</dd>
									<dt className="text-muted-foreground">Scenario</dt>
									<dd className="break-all">
										{shortScenario(decision.scenario)}
									</dd>
									{decision.host.asName && (
										<>
											<dt className="text-muted-foreground">Network</dt>
											<dd className="break-all">{decision.host.asName}</dd>
										</>
									)}
								</dl>
							)}
							<p>
								It stays in this dashboard's history. If the same behaviour
								repeats, CrowdSec will ban the host again.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Keep it</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={() => {
							if (!decision) return;
							haptic();
							onConfirm(decision);
						}}
					>
						<Trash2 className="size-4" />
						Remove decision
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

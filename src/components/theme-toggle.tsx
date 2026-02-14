import { MonitorCog, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "../context/theme-provider";
import { cn } from "../lib/utils";

interface ThemeToggleProps {
	className?: string;
	collapsed?: boolean;
}

/** Theme toggler which displays either as a button group or a dropdown menu based on the `collapsed` prop */
export function ThemeToggle({
	className,
	collapsed,
}: Readonly<ThemeToggleProps>) {
	const { theme, setTheme } = useTheme();

	if (collapsed) {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className={cn("h-8 w-8", className)}
						size="icon"
						variant="ghost"
					>
						<Sun className="dark:-rotate-90 h-4 w-4 rotate-0 scale-100 transition-all dark:scale-0" />
						<Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
						<span className="sr-only">Toggle theme</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" side="right">
					<DropdownMenuItem onClick={() => setTheme("light")}>
						Light
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("dark")}>
						Dark
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("system")}>
						System
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<ButtonGroup
			aria-label="Theme toggle"
			className={cn(className, "flex w-full flex-row")}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label="Set system theme"
						className="grow"
						onClick={() => setTheme("system")}
						size="icon"
						variant={theme === "system" ? "secondary" : "ghost"}
					>
						<MonitorCog className="h-[1.2rem]" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>System</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label="Set light theme"
						className="grow"
						onClick={() => setTheme("light")}
						size="icon"
						variant={theme === "light" ? "secondary" : "ghost"}
					>
						<Sun className="h-[1.2rem]" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Light</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label="Set dark theme"
						className="grow"
						onClick={() => setTheme("dark")}
						size="icon"
						variant={theme === "dark" ? "secondary" : "ghost"}
					>
						<Moon className="h-[1.2rem]" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Dark</TooltipContent>
			</Tooltip>
		</ButtonGroup>
	);
}

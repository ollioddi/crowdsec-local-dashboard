import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	ChevronUp,
	Monitor,
	ScrollText,
	Shield,
	User2,
	Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarSeparator,
	useSidebar,
} from "@/components/ui/sidebar";
import { useAppSession } from "@/context/session-provider";
import { signOut } from "@/lib/auth-client";

const navigationItems = [
	{
		icon: Monitor,
		title: "Hosts",
		url: "/hosts",
	},
	{
		icon: ScrollText,
		title: "Decisions",
		url: "/decisions",
	},
	{
		icon: Users,
		title: "Users",
		url: "/users",
	},
];

export function AppSidebar() {
	const router = useRouterState();
	const currentPath = router.location.pathname;
	const session = useAppSession();
	const { open } = useSidebar();
	const navigate = useNavigate();

	const handleSignOut = () => {
		signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate({ to: "/login" });
				},
			},
		});
	};

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="h-auto data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							size="lg"
						>
							<Link
								className="flex items-center justify-center gap-2 py-2"
								to="/hosts"
							>
								<Shield className="size-6 shrink-0" />
								{open && (
									<div className="grid flex-1 text-left leading-tight">
										<span className="truncate font-semibold">CrowdSec</span>
										<span className="truncate text-xs text-muted-foreground">
											Dashboard
										</span>
									</div>
								)}
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				{open && <SidebarSeparator className="my-1" />}
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navigationItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={currentPath.startsWith(item.url)}
										tooltip={item.title}
									>
										<Link to={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<ThemeToggle className={open ? "pb-2" : ""} collapsed={!open} />
					</SidebarMenuItem>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton className="h-auto py-2">
									<User2 />
									{open && (
										<div className="flex flex-col items-start text-left">
											<span className="truncate font-medium">
												{session.user.name ?? "User"}
											</span>
											<span className="truncate text-muted-foreground text-xs">
												{session.user.email}
											</span>
										</div>
									)}
									<ChevronUp className="ml-auto" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[--radix-popper-anchor-width]"
								side="top"
							>
								<DropdownMenuItem onSelect={handleSignOut}>
									<span>Sign out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

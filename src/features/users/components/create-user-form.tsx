import { useForm } from "@tanstack/react-form-start";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/common/components/ui/card";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/common/components/ui/drawer";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/common/components/ui/field";
import { Input } from "@/common/components/ui/input";
import {
	createUserFn,
	createUserSchema,
} from "@/features/users/api/users.functions";

const TITLE = "Create User";
const DESCRIPTION = "Add a new user to the dashboard";

function CreateUserForm({ onCreated }: Readonly<{ onCreated?: () => void }>) {
	const queryClient = useQueryClient();
	const form = useForm({
		defaultValues: {
			username: "",
			password: "",
			email: "",
		},
		validators: {
			onSubmit: createUserSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				const result = await createUserFn({ data: value });
				if (result.error) {
					form.setErrorMap({ onSubmit: { form: result.error, fields: {} } });
				} else {
					form.reset();
					toast.success("User created", {
						description: `Username: ${result.username}`,
					});
					queryClient.invalidateQueries({ queryKey: ["users"] });
					onCreated?.();
				}
			} catch {
				form.setErrorMap({
					onSubmit: { form: "Failed to create user.", fields: {} },
				});
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup>
				<form.Field name="username">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Username</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
									placeholder="johndoe"
									autoComplete="off"
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Field name="password">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Password</FieldLabel>
								<Input
									id={field.name}
									type="password"
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
									placeholder="••••••••"
									autoComplete="off"
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Field name="email">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Email (optional)</FieldLabel>
								<Input
									id={field.name}
									type="email"
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
									placeholder="user@example.com"
									autoComplete="off"
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Subscribe selector={(state) => state.errors}>
					{(errors) => {
						const messages = errors.filter((e) => typeof e === "string");
						if (messages.length === 0) return null;
						return (
							<div className="flex flex-col gap-1">
								{messages.map((message) => (
									<p key={message} className="text-sm text-red-500">
										{message}
									</p>
								))}
							</div>
						);
					}}
				</form.Subscribe>
				<Field>
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" loading={isSubmitting}>
								Create user
							</Button>
						)}
					</form.Subscribe>
				</Field>
			</FieldGroup>
		</form>
	);
}

/** Sidebar card, wide screens only. */
export function CreateUserCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{TITLE}</CardTitle>
				<CardDescription>{DESCRIPTION}</CardDescription>
			</CardHeader>
			<CardContent>
				<CreateUserForm />
			</CardContent>
		</Card>
	);
}

/** Narrow screens get the form on demand, so the table keeps the viewport. */
export function CreateUserDrawer({
	className,
}: Readonly<{ className?: string }>) {
	const [open, setOpen] = useState(false);

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button size="sm" className={className}>
					<Plus className="size-4" />
					New user
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>{TITLE}</DrawerTitle>
					<DrawerDescription>{DESCRIPTION}</DrawerDescription>
				</DrawerHeader>
				<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
					<CreateUserForm onCreated={() => setOpen(false)} />
				</div>
			</DrawerContent>
		</Drawer>
	);
}

import { useForm } from "@tanstack/react-form-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createUserFn, createUserSchema } from "@/lib/users.functions";

export function CreateUserForm() {
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
				}
			} catch {
				form.setErrorMap({
					onSubmit: { form: "Failed to create user.", fields: {} },
				});
			}
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create User</CardTitle>
				<CardDescription>Add a new user to the dashboard</CardDescription>
			</CardHeader>
			<CardContent>
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
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
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
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
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
										<FieldLabel htmlFor={field.name}>
											Email (optional)
										</FieldLabel>
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
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
						<form.Subscribe selector={(state) => state.errors}>
							{(errors) =>
								errors.length > 0 && (
									<p className="text-sm text-red-500">
										<div className="flex flex-col gap-1">
											{errors
												.map((e) => (typeof e === "string" ? e : undefined))
												.filter(Boolean)
												.map((m) => (
													<div key={m} className="text-sm text-red-500">
														{m}
													</div>
												))}
										</div>
									</p>
								)
							}
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
			</CardContent>
		</Card>
	);
}

import { useForm } from "@tanstack/react-form-start";
import {
	createFileRoute,
	useLoaderData,
	useRouter,
} from "@tanstack/react-router";
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
import {
	ensureAdminAndSignInFn,
	isFirstSetupFn,
	loginSchema,
} from "@/lib/auth.functions";

const LoginPage = () => {
	const router = useRouter();
	const { isFirstSetup } = useLoaderData({ from: "/login" });

	const form = useForm({
		defaultValues: {
			username: "",
			password: "",
		},
		validators: {
			onSubmit: loginSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				const result = await ensureAdminAndSignInFn({
					data: value,
				});
				if ("error" in result && result.error) {
					form.setErrorMap({ onSubmit: { form: result.error, fields: {} } });
				} else {
					router.navigate({ to: "/" });
				}
			} catch {
				form.setErrorMap({
					onSubmit: { form: "Login failed. Please try again.", fields: {} },
				});
			}
		},
	});

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="flex flex-col gap-6 w-full max-w-sm">
				<Card>
					<CardHeader>
						<CardTitle>
							{isFirstSetup ? "Create Admin Account" : "Login"}
						</CardTitle>
						<CardDescription>
							{isFirstSetup
								? "Choose a username and password for the admin account"
								: "Enter your credentials to access the dashboard"}
						</CardDescription>
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
											<Button type="submit" disabled={isSubmitting}>
												{isSubmitting
													? isFirstSetup
														? "Creating account..."
														: "Signing in..."
													: isFirstSetup
														? "Create account & sign in"
														: "Sign in"}
											</Button>
										)}
									</form.Subscribe>
								</Field>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export const Route = createFileRoute("/login")({
	component: LoginPage,
	loader: async () => {
		const isFirstSetup = await isFirstSetupFn();
		return { isFirstSetup };
	},
});

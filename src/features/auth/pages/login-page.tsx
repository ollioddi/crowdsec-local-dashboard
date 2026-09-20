import { useForm } from "@tanstack/react-form-start";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
	ensureAdminAndSignInFn,
	loginSchema,
} from "@/common/auth/auth.functions";
import { authClient } from "@/common/auth/auth-client";
import { Button } from "@/common/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/common/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/common/components/ui/field";
import { Input } from "@/common/components/ui/input";
import { useTitle } from "@/common/hooks/use-title";

const signInWithOidc = () =>
	authClient.signIn.social({ provider: "oidc", callbackURL: "/" });

export const LoginPage = () => {
	const router = useRouter();
	const { isFirstSetup, oidcConfig } = useLoaderData({ from: "/login" });
	useTitle(isFirstSetup ? "Create admin account" : "Login");

	useEffect(() => {
		if (!isFirstSetup && oidcConfig.enabled && oidcConfig.autoRedirect) {
			signInWithOidc();
		}
	}, [isFirstSetup, oidcConfig]);

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
						{oidcConfig.enabled && !isFirstSetup && (
							<>
								<div className="relative my-4">
									<div className="absolute inset-0 flex items-center">
										<span className="w-full border-t" />
									</div>
									<div className="relative flex justify-center text-xs uppercase">
										<span className="bg-card px-2 text-muted-foreground">
											or
										</span>
									</div>
								</div>
								<Button
									variant="outline"
									className="w-full"
									onClick={signInWithOidc}
								>
									{oidcConfig.buttonLabel}
								</Button>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

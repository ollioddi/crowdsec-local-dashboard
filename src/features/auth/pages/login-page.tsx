import { useForm } from "@tanstack/react-form-start";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import z from "zod";
import { createFirstAdminFn } from "@/common/auth/auth.functions";
import { authClient } from "@/common/auth/auth-client";
import {
	firstAdminSchema,
	PASSWORD_HINT,
	SETUP_CODE_HINT,
	signInSchema,
	USERNAME_HINT,
} from "@/common/auth/credentials";
import { type SignInFailure, signInWithPassword } from "@/common/auth/sign-in";
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
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/common/components/ui/field";
import { Input } from "@/common/components/ui/input";
import { useTitle } from "@/common/hooks/use-title";
import { describeRequestFailure } from "@/common/lib/request-error";
import { useSignInCooldown } from "@/features/auth/hooks/use-sign-in-cooldown";

// The setup code field is hidden when signing in
const signInFormSchema = signInSchema.extend({ setupCode: z.string() });

const signInWithOidc = () =>
	authClient.signIn.social({ provider: "oidc", callbackURL: "/" });

export const LoginPage = () => {
	const router = useRouter();
	const { isFirstSetup, oidcConfig, signInWindowSeconds } = useLoaderData({
		from: "/login",
	});
	useTitle(isFirstSetup ? "Create admin account" : "Login");

	useEffect(() => {
		if (!isFirstSetup && oidcConfig.enabled && oidcConfig.autoRedirect) {
			signInWithOidc();
		}
	}, [isFirstSetup, oidcConfig]);

	const form = useForm({
		defaultValues: {
			setupCode: "",
			username: "",
			password: "",
		},
		validators: isFirstSetup
			? { onChange: firstAdminSchema, onSubmit: firstAdminSchema }
			: { onSubmit: signInFormSchema },
		onSubmit: async ({ value }) => {
			const failure = await submit(value);
			if (failure === null) {
				router.navigate({ to: "/" });
			} else if ("retryAt" in failure) {
				form.setErrorMap({ onSubmit: undefined });
				cooldown.start(failure.retryAt);
			} else {
				form.setErrorMap({ onSubmit: { form: failure.error, fields: {} } });
			}
		},
	});
	const cooldown = useSignInCooldown();

	const submit = async (value: {
		setupCode: string;
		username: string;
		password: string;
	}): Promise<SignInFailure | null> => {
		const username = value.username.trim();
		if (!isFirstSetup) {
			return signInWithPassword(username, value.password, signInWindowSeconds);
		}
		try {
			const result = await createFirstAdminFn({
				data: { ...value, username },
			});
			if (result.error !== undefined) return { error: result.error };
			return signInWithPassword(
				result.username,
				value.password,
				signInWindowSeconds,
			);
		} catch (error) {
			return { error: describeRequestFailure(error) };
		}
	};

	const submitLabel = isFirstSetup ? "Create account & sign in" : "Sign in";
	const submittingLabel = isFirstSetup
		? "Creating account..."
		: "Signing in...";

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
								{isFirstSetup && (
									<form.Field name="setupCode">
										{(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel htmlFor={field.name}>
														Setup code
													</FieldLabel>
													<Input
														id={field.name}
														name={field.name}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
														placeholder="ABCD-EFGH-JKMN"
														autoComplete="one-time-code"
														className="font-mono uppercase"
													/>
													<FieldDescription>{SETUP_CODE_HINT}</FieldDescription>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											);
										}}
									</form.Field>
								)}
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
													autoComplete="username"
												/>
												{isFirstSetup && (
													<FieldDescription>{USERNAME_HINT}</FieldDescription>
												)}
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
													autoComplete={
														isFirstSetup ? "new-password" : "current-password"
													}
												/>
												{isFirstSetup && (
													<FieldDescription>{PASSWORD_HINT}</FieldDescription>
												)}
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
											<div role="alert" className="flex flex-col gap-1">
												{errors
													.filter((e) => typeof e === "string")
													.map((message) => (
														<p key={message} className="text-sm text-red-500">
															{message}
														</p>
													))}
											</div>
										)
									}
								</form.Subscribe>
								{cooldown.secondsLeft > 0 && (
									<p role="status" className="text-sm text-red-500">
										Too many sign-in attempts. Try again in{" "}
										{cooldown.secondsLeft === 1
											? "1 second"
											: `${cooldown.secondsLeft} seconds`}
										.
									</p>
								)}
								<Field>
									<form.Subscribe selector={(state) => state.isSubmitting}>
										{(isSubmitting) => (
											<Button
												type="submit"
												disabled={isSubmitting || cooldown.secondsLeft > 0}
											>
												{isSubmitting ? submittingLabel : submitLabel}
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

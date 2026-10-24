import z from "zod";

// Used by the forms, the server and better-auth
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// better-auth's default username validator
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

export const USERNAME_HINT = `${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters: letters, numbers, dots and underscores.`;
export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters. A passphrase of a few words works well.`;

export const usernameSchema = z
	.string()
	.trim()
	.min(USERNAME_MIN_LENGTH, `Use at least ${USERNAME_MIN_LENGTH} characters`)
	.max(USERNAME_MAX_LENGTH, `Use at most ${USERNAME_MAX_LENGTH} characters`)
	.regex(USERNAME_PATTERN, "Use only letters, numbers, dots and underscores");

export const newPasswordSchema = z
	.string()
	.min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
	.max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`);

// Only length caps, so older accounts can still sign in
export const signInSchema = z.object({
	username: z
		.string()
		.trim()
		.min(1, "Username is required")
		.max(USERNAME_MAX_LENGTH, "Invalid username or password"),
	password: z
		.string()
		.min(1, "Password is required")
		.max(PASSWORD_MAX_LENGTH, "Invalid username or password"),
});

export const SETUP_CODE_HINT =
	"Printed in the dashboard's log when it starts, e.g. docker logs crowdsec-dashboard.";

export const firstAdminSchema = z.object({
	setupCode: z.string().trim().min(1, "Setup code is required").max(32),
	username: usernameSchema,
	password: newPasswordSchema,
});

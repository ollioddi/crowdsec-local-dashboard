import { authClient } from "@/common/auth/auth-client";
import { describeRequestFailure } from "@/common/lib/request-error";

export type SignInFailure =
	| { error: string }
	// Rate limited until this time (ms)
	| { retryAt: number };

/** Signs in through /api/auth, which is rate limited. */
export async function signInWithPassword(
	username: string,
	password: string,
	windowSeconds: number,
): Promise<SignInFailure | null> {
	// Kept to read X-Retry-After
	let failedResponse: Response | null = null;
	try {
		const { error } = await authClient.signIn.username(
			{ username, password },
			{
				onError: ({ response }) => {
					failedResponse = response;
				},
			},
		);
		if (!error) return null;
		if (error.status === 429) {
			const seconds = retryAfterSeconds(failedResponse, windowSeconds);
			return { retryAt: Date.now() + seconds * 1000 };
		}
		return { error: describeSignInError(error.status) };
	} catch (error) {
		return { error: describeRequestFailure(error) };
	}
}

// X-Retry-After, or the whole window if the header is missing
function retryAfterSeconds(
	response: Response | null,
	windowSeconds: number,
): number {
	const seconds = Number(response?.headers.get("X-Retry-After"));
	return seconds > 0 ? seconds : windowSeconds;
}

// Generic messages, so a wrong username and a wrong password look the same
function describeSignInError(status: number) {
	if (status === 403) {
		return "Sign-in was refused. Check that BETTER_AUTH_URL matches the address you opened.";
	}
	if (status >= 500) return "Sign-in failed on the server. Try again shortly.";
	return "Invalid username or password";
}

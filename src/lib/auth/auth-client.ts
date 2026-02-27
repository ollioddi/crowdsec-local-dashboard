import { genericOAuthClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [usernameClient(), genericOAuthClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;

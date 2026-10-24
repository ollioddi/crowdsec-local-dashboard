import { createContext, type ReactNode, useContext } from "react";
import type { ClientSession } from "@/common/auth/auth.functions";

const SessionContext = createContext<ClientSession | null>(null);

interface SessionProviderProps {
	children: ReactNode;
	session: ClientSession;
}

export function SessionProvider({
	children,
	session,
}: Readonly<SessionProviderProps>) {
	return (
		<SessionContext.Provider value={session}>
			{children}
		</SessionContext.Provider>
	);
}

/**
 * Hook to access the current session, or null if outside SessionProvider.
 */
export function useOptionalSession(): ClientSession | null {
	return useContext(SessionContext);
}

/**
 * Hook to access the current session.
 * Must be used within a SessionProvider.
 */
export function useAppSession() {
	const session = useContext(SessionContext);
	if (!session) {
		throw new Error("useAppSession must be used within SessionProvider");
	}
	return session;
}

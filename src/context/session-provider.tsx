import { createContext, type ReactNode, useContext } from "react";
import type { Session } from "@/lib/auth.server";

const SessionContext = createContext<Session | null>(null);

interface SessionProviderProps {
	children: ReactNode;
	session: Session;
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
export function useOptionalSession(): Session | null {
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

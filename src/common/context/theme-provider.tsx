import { useHydrated } from "@tanstack/react-router";
import {
	createContext,
	type ReactNode,
	useContext,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";

// ============ Context ============

type ThemeContextValue = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const initialState: ThemeContextValue = {
	setTheme: () => null,
	theme: "system",
};

const ThemeProviderContext = createContext<ThemeContextValue>(initialState);

// ============ Provider ============

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
	children: ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "crowdsec-dashboard-theme",
	...props
}: Readonly<ThemeProviderProps>) {
	const hydrated = useHydrated();
	const [theme, setTheme] = useState<Theme>(defaultTheme);

	// Load theme from localStorage synchronously before paint to avoid flash
	useLayoutEffect(() => {
		const stored = localStorage.getItem(storageKey) as Theme;
		if (stored) {
			setTheme(stored);
		}
	}, [storageKey]);

	// Apply theme class synchronously before paint
	useLayoutEffect(() => {
		const root = globalThis.document.documentElement;

		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = globalThis.matchMedia("(prefers-color-scheme: dark)")
				.matches
				? "dark"
				: "light";

			root.classList.add(systemTheme);
			return;
		}

		root.classList.add(theme);
	}, [theme]);

	const value = useMemo(
		() => ({
			setTheme: (theme: Theme) => {
				if (hydrated) {
					localStorage.setItem(storageKey, theme);
				}
				setTheme(theme);
			},
			theme,
		}),
		[theme, storageKey, hydrated],
	);

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

// ============ Hook ============

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}

	return context;
};

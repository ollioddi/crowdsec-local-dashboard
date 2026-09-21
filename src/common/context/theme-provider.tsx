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
		const query = globalThis.matchMedia("(prefers-color-scheme: dark)");

		const apply = () => {
			const resolved =
				theme === "system" ? (query.matches ? "dark" : "light") : theme;

			root.classList.remove("light", "dark");
			root.classList.add(resolved);
			// Installed PWAs paint their status and title bars from this
			syncThemeColor(resolved);
		};

		apply();
		if (theme !== "system") return;

		query.addEventListener("change", apply);
		return () => query.removeEventListener("change", apply);
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

/** Keeps theme-color in step so an installed app's status bar matches. */
function syncThemeColor(resolved: "dark" | "light") {
	const color = getComputedStyle(document.documentElement)
		.getPropertyValue("--background")
		.trim();
	if (!color) return;
	const meta = document.querySelector<HTMLMetaElement>(
		'meta[name="theme-color"]',
	);
	if (meta) meta.content = color;
	document.documentElement.style.colorScheme = resolved;
}

// ============ Hook ============

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}

	return context;
};

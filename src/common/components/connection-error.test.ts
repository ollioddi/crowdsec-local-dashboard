// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ConnectionError } from "./connection-error";

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it.each([
	[true, "Failed to fetch", "Cannot reach the dashboard"],
	[true, "Invalid response", "Could not load this page"],
	[false, "Failed to fetch", "You are offline"],
])(
	"shows the right error state when online=%s and error=%s",
	(online, error, title) => {
		vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
		const view = render(
			createElement(ConnectionError, {
				error: new Error(error),
				reset: vi.fn(),
			}),
		);
		expect(view.getByRole("heading").textContent).toBe(title);
	},
);

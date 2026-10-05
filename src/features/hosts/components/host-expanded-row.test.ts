// @vitest-environment jsdom
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { HostExpandedRow } from "./host-expanded-row";

const target =
	"/a/very/long/target/that/must/remain/readable/on/a/touch/screen";

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({
		data: {
			alertCount: 1,
			scenarios: [],
			targets: [
				{
					label: "Requested paths",
					total: 1,
					values: [
						{
							value:
								"/a/very/long/target/that/must/remain/readable/on/a/touch/screen",
							alertCount: 1,
						},
					],
				},
			],
			network: { ranges: [] },
		},
	}),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) =>
		createElement("a", { href: "/decisions" }, children),
}));
vi.mock("@/features/hosts/api/hosts.functions", () => ({
	getHostActivityFn: vi.fn(),
}));
vi.mock("@/features/decisions/components/columns", () => ({
	shortScenario: (value: string) => value,
}));

afterEach(cleanup);

it("opens full target values even when the small set has no Browse button", () => {
	const row = {
		original: { ip: "192.0.2.1", scope: "Ip", _count: { decisions: 0 } },
	} as Parameters<typeof HostExpandedRow>[0]["row"];
	const view = render(createElement(HostExpandedRow, { row }));
	expect(view.queryByRole("button", { name: /Browse/ })).toBeNull();
	fireEvent.click(view.getByRole("button", { name: `${target}×1` }));
	const dialog = view.getByRole("dialog", { name: "Requested paths" });
	expect(within(dialog).getByText(target)).toBeTruthy();
	fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
	expect(view.queryByRole("dialog")).toBeNull();
});

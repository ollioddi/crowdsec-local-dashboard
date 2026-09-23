// @vitest-environment jsdom

import { useTable } from "@tanstack/react-table";
import { cleanup, fireEvent, render, renderHook } from "@testing-library/react";
import { createElement, createRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import DataTableCards from "./data-table-cards";
import { dataTableFeatures } from "./table-features";

vi.mock("@tanstack/react-router", () => ({ useHydrated: () => true }));
afterEach(cleanup);

it("keeps title links independent from the drawer button", () => {
	const { result } = renderHook(() =>
		useTable({
			features: dataTableFeatures,
			data: [{ ip: "192.0.2.1" }],
			columns: [
				{
					accessorKey: "ip",
					meta: { card: "title" },
					cell: () => createElement("a", { href: "#host" }, "192.0.2.1"),
				},
			],
		}),
	);
	const toggle = vi.spyOn(
		result.current.getRowModel().rows[0],
		"toggleExpanded",
	);
	const view = render(
		createElement(DataTableCards<{ ip: string }>, {
			table: result.current,
			scrollRef: createRef<HTMLDivElement>(),
			renderSubComponent: () => createElement("p", null, "Evidence"),
		}),
	);
	const link = view.getByRole("link", { name: "192.0.2.1" });
	expect(link.closest("button")).toBeNull();
	fireEvent.click(link);
	expect(toggle).not.toHaveBeenCalled();
	fireEvent.click(view.getByRole("button", { name: "Expand row details" }));
	expect(toggle).toHaveBeenCalledOnce();
});

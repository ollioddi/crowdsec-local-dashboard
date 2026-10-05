// @vitest-environment jsdom
import { useTable } from "@tanstack/react-table";
import { cleanup, fireEvent, render, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { FilterEditor } from "@/common/components/data-table/filters/filter-editor";
import { dataTableFeatures } from "@/common/components/data-table/table-features";
import type { DecisionWithHost } from "../api/decisions.types";
import { createColumns } from "./columns";

afterEach(cleanup);
vi.stubGlobal(
	"ResizeObserver",
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	},
);
Element.prototype.scrollIntoView = vi.fn();

it("suggests existing scenarios with counts while retaining text operators", () => {
	const scenario = createColumns(vi.fn(), undefined).find(
		(c) => "accessorKey" in c && c.accessorKey === "scenario",
	);
	if (!scenario) throw new Error("Missing scenario column");
	const { result } = renderHook(() =>
		useTable({
			features: dataTableFeatures,
			data: [],
			columns: [scenario],
		}),
	);
	const column = result.current.getColumn("scenario");
	if (!column) throw new Error("Missing scenario column");
	vi.spyOn(column, "getFacetedUniqueValues").mockReturnValue(
		new Map([
			["crowdsecurity/dovecot-spam", 5],
			["crowdsecurity/postscreen-rbl", 67],
		]),
	);
	const onApply = vi.fn();
	const view = render(
		createElement(FilterEditor<DecisionWithHost>, {
			column,
			active: undefined,
			onApply,
		}),
	);
	fireEvent.click(
		view.getByRole("option", { name: /crowdsecurity\/dovecot-spam.*5/ }),
	);
	fireEvent.click(view.getByRole("button", { name: "Apply" }));
	expect(onApply).toHaveBeenCalledWith({
		operator: "contains",
		value: "crowdsecurity/dovecot-spam",
	});
});

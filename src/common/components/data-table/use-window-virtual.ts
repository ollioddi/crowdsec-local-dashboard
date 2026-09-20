import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";

interface WindowVirtualOptions {
	count: number;
	/** False until hydration, so the server and the first client paint agree */
	enabled: boolean;
	estimateSize: (index: number) => number;
	overscan: number;
}

/** Put `anchorRef` at the top of the list; it measures where the list starts */
export function useWindowVirtual<T extends HTMLElement>({
	count,
	enabled,
	estimateSize,
	overscan,
}: WindowVirtualOptions) {
	// The compiler would cache the mutable virtualizer's first getVirtualItems()
	"use no memo";
	const anchorRef = useRef<T>(null);
	const [scrollMargin, setScrollMargin] = useState(0);

	useLayoutEffect(() => {
		const anchor = anchorRef.current;
		if (anchor) {
			setScrollMargin(anchor.getBoundingClientRect().top + window.scrollY);
		}
	}, []);

	const virtualizer = useWindowVirtualizer({
		count,
		enabled,
		scrollMargin,
		estimateSize,
		overscan,
	});

	const items = virtualizer.getVirtualItems();
	const last = items[items.length - 1];

	return {
		anchorRef,
		items,
		measureElement: virtualizer.measureElement,
		// Item offsets include the scroll margin, the total size does not
		topPadding: items.length > 0 ? items[0].start - scrollMargin : 0,
		bottomPadding: last
			? virtualizer.getTotalSize() - (last.end - scrollMargin)
			: 0,
	};
}

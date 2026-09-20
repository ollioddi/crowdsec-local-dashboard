import { useVirtualizer } from "@tanstack/react-virtual";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";

interface VirtualRowsOptions<TScroll extends HTMLElement> {
	/** The scrolling container the rows live in. */
	scrollRef: RefObject<TScroll | null>;
	count: number;
	/** False until hydration, so the server and the first client paint agree */
	enabled: boolean;
	estimateSize: (index: number) => number;
	overscan: number;
}

/**
 * Virtualizes rows inside a scrolling container, not the window.
 * `anchorRef` goes at the top of the list to measure where it starts.
 * Padding is rounded: fractional spacers put rows on half-pixel offsets,
 * where 1px borders fall between device pixels and vanish at dpr 1.
 */
export function useVirtualRows<
	TAnchor extends HTMLElement,
	TScroll extends HTMLElement,
>({
	scrollRef,
	count,
	enabled,
	estimateSize,
	overscan,
}: VirtualRowsOptions<TScroll>) {
	// The compiler would cache the mutable virtualizer's first getVirtualItems()
	"use no memo";
	const anchorRef = useRef<TAnchor>(null);
	const [scrollMargin, setScrollMargin] = useState(0);

	useLayoutEffect(() => {
		const anchor = anchorRef.current;
		const scroller = scrollRef.current;
		if (!anchor || !scroller) return;
		const offset =
			anchor.getBoundingClientRect().top -
			scroller.getBoundingClientRect().top +
			scroller.scrollTop;
		setScrollMargin(Math.round(offset));
	}, [scrollRef]);

	const virtualizer = useVirtualizer({
		count,
		enabled,
		getScrollElement: () => scrollRef.current,
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
		topPadding:
			items.length > 0 ? Math.round(items[0].start - scrollMargin) : 0,
		bottomPadding: last
			? Math.round(virtualizer.getTotalSize() - (last.end - scrollMargin))
			: 0,
	};
}

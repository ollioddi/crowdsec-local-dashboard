import { useEffect } from "react";
import { APP_NAME } from "@/common/lib/version";

/** Sets the document title to `<title> · CrowdSec Dashboard` while mounted. */
export function useTitle(title: string) {
	useEffect(() => {
		document.title = `${title} · ${APP_NAME}`;
	}, [title]);
}

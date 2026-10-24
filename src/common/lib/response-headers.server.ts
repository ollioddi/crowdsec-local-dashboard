/** Pages contain user data, so don't cache them. */
function noStoreForPages(headers: Headers) {
	const type = headers.get("content-type") ?? "";
	if (type.startsWith("text/html") && !headers.has("cache-control")) {
		headers.set("cache-control", "no-store");
	}
}

export function applyResponseHeaders(response: Response): Response {
	try {
		noStoreForPages(response.headers);
		return response;
	} catch {
		// Some responses have read-only headers
		const copy = new Response(response.body, response);
		noStoreForPages(copy.headers);
		return copy;
	}
}

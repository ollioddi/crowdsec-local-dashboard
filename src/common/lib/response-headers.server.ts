// No script-src: TanStack's inline scripts would need nonces
const CONTENT_SECURITY_POLICY = [
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"object-src 'none'",
	"form-action 'self'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
	"content-security-policy": CONTENT_SECURITY_POLICY,
	"x-frame-options": "DENY",
	"x-content-type-options": "nosniff",
	"referrer-policy": "same-origin",
	"permissions-policy":
		"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

function securityHeaders(headers: Headers) {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(name)) headers.set(name, value);
	}
}

/** Pages contain user data, so don't cache them. */
function noStoreForPages(headers: Headers) {
	const type = headers.get("content-type") ?? "";
	if (type.startsWith("text/html") && !headers.has("cache-control")) {
		headers.set("cache-control", "no-store");
	}
}

function apply(headers: Headers) {
	securityHeaders(headers);
	noStoreForPages(headers);
}

export function applyResponseHeaders(response: Response): Response {
	try {
		apply(response.headers);
		return response;
	} catch {
		// Some responses have read-only headers
		const copy = new Response(response.body, response);
		apply(copy.headers);
		return copy;
	}
}

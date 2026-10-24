/** Adds the real socket address to X-Forwarded-For, so a client can't fake its IP. */
export function withPeerAddress(request: Request): Request {
	// Not available in the Vite dev server
	const peer = (request as Request & { ip?: string }).ip;
	if (!peer) return request;
	const forwarded = request.headers.get("x-forwarded-for");
	request.headers.set(
		"x-forwarded-for",
		forwarded ? `${forwarded}, ${peer}` : peer,
	);
	return request;
}

/**
 * Conservative by design: the app is auth-gated and rendered per request, so
 * no HTML or API response is cached. Static assets and an offline page only.
 */

const VERSION = "v2";
const ASSET_CACHE = `assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

/** Hashed build output and icons, safe to serve from cache first. */
const IMMUTABLE_PATHS = [/^\/_build\//, /^\/assets\//, /^\/icons\//];

/** Never touched by the cache: auth, data, and the event stream. */
const NEVER_CACHE = [
	/^\/api\//,
	/^\/sse\//,
	/^\/_serverFn\//,
	/^\/login/,
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(ASSET_CACHE)
			.then((cache) => cache.addAll([OFFLINE_URL, "/favicon.svg"]))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((key) => key !== ASSET_CACHE).map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

function isImmutable(pathname) {
	return IMMUTABLE_PATHS.some((pattern) => pattern.test(pathname));
}

function isNeverCached(pathname) {
	return NEVER_CACHE.some((pattern) => pattern.test(pathname));
}

async function cacheFirst(request) {
	const cached = await caches.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) {
		const cache = await caches.open(ASSET_CACHE);
		cache.put(request, response.clone());
	}
	return response;
}

/** Navigations always go to the network; offline gets the fallback page. */
async function navigate(request) {
	try {
		return await fetch(request);
	} catch {
		const offline = await caches.match(OFFLINE_URL);
		return (
			offline ??
			new Response("Offline", {
				status: 503,
				headers: { "Content-Type": "text/plain" },
			})
		);
	}
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (isNeverCached(url.pathname)) return;

	if (request.mode === "navigate") {
		event.respondWith(navigate(request));
		return;
	}

	if (isImmutable(url.pathname)) {
		event.respondWith(cacheFirst(request));
	}
});

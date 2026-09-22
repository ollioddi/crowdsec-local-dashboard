// One source for the published location. Read by astro.config.mjs and sync-docs.
export const site = "https://ollioddi.github.io";
export const base = "/crowdsec-local-dashboard";
export const repo = "https://github.com/ollioddi/crowdsec-local-dashboard";

// Archived doc versions, newest first, e.g. { slug: "0.6" }. docs/ is the
// unreleased version and always lives at the site root; adding an entry freezes
// a snapshot of today's docs under that slug. Nothing is archivable before v0.6,
// because docs/ does not exist in any earlier tag.
export const versions = [];

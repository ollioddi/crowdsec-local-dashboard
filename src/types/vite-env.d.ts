interface ImportMetaEnv {
	/** Set at build time from the APP_VERSION build arg; see the Dockerfile */
	readonly VITE_APP_VERSION?: string;
}

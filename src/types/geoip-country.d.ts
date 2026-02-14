declare module "geoip-country" {
	interface GeoIPResult {
		country: string;
		name: string;
		native: string;
		continent: string;
		continent_name: string;
		capital: string;
		phone: number[];
		currency: string[];
		languages: string[];
	}

	function lookup(ip: string): GeoIPResult | null;
}

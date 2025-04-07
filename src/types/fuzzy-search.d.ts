declare module "fuzzy-search" {
	interface FuzzySearchOptions {
		caseSensitive?: boolean;
		sort?: boolean;
		keySelector?: (item: any) => string;
	}

	class FuzzySearch {
		constructor(haystack: any[], keys: string[], options?: FuzzySearchOptions);
		search(query: string): any[];
	}

	export default FuzzySearch;
}

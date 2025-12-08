declare module 'fuzzy-search' {
	interface FuzzySearchOptions<T> {
		caseSensitive?: boolean;
		sort?: boolean;
		keySelector?: (item: T) => string;
	}

	class FuzzySearch<T> {
		constructor(haystack: T[], keys: Array<keyof T & string>, options?: FuzzySearchOptions<T>);
		search(query: string): T[];
	}

	export = FuzzySearch;
}

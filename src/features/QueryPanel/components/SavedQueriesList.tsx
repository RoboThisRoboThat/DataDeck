import { useState, type ChangeEvent, type MouseEvent } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
	FiDatabase,
	FiTrash2,
	FiSearch,
	FiAlertCircle,
	FiClock,
} from "react-icons/fi";

interface SavedQuery {
	name: string;
	sql: string;
	createdAt: string;
	description?: string;
}

interface SavedQueriesListProps {
	connectionId: string;
	onSelectQuery: (sql: string, name: string) => void;
	onDeleteQuery: (name: string) => void;
	currentQueryName: string | null;
	queries: SavedQuery[];
	loading: boolean;
	error: string | null;
	onRefetchQueries: () => void;
}

const SavedQueriesList = ({
	onSelectQuery,
	onDeleteQuery,
	currentQueryName,
	queries,
	loading,
	error,
	onRefetchQueries,
}: SavedQueriesListProps) => {
	// State for search
	const [searchTerm, setSearchTerm] = useState<string>("");

	// Handle search
	const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	};

	// Filter queries based on search term
	const filteredQueries = searchTerm
		? queries.filter(
				(query) =>
					query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					query.description?.toLowerCase().includes(searchTerm.toLowerCase()),
			)
		: queries;

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();

		// If it's today, just show the time
		if (date.toDateString() === now.toDateString()) {
			return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
		}

		// If it's yesterday
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		if (date.toDateString() === yesterday.toDateString()) {
			return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
		}

		// Otherwise show the full date
		return date.toLocaleDateString([], {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Handle query deletion
	const handleDeleteQuery = async (name: string, event: MouseEvent) => {
		// Stop propagation to prevent selecting the query when deleting
		event.stopPropagation();

		// Confirm before deleting
		if (
			window.confirm(`Are you sure you want to delete the query "${name}"?`)
		) {
			await onDeleteQuery(name);
			// Refresh the queries list after deletion using the provided method
			onRefetchQueries();
		}
	};

	// Render loading state
	if (loading) {
		return (
			<div className="p-4">
				<div className="relative mb-4">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<FiSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
					</div>
					<input
						className="bg-gray-100 dark:bg-gray-800 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-700 rounded-md py-2 pr-3 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100"
						type="text"
						placeholder="Search queries..."
						disabled
					/>
				</div>

				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="mb-4 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700"
					>
						<Skeleton className="w-70 h-28 bg-gray-200 dark:bg-gray-700" />
						<Skeleton className="w-40 h-16 mt-2 bg-gray-200 dark:bg-gray-700" />
					</div>
				))}
			</div>
		);
	}

	// Render error state
	if (error) {
		return (
			<div className="p-4">
				<div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-start rounded border border-red-200 dark:border-red-900/50">
					<FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
					<p className="text-sm">{error}</p>
				</div>
			</div>
		);
	}

	// Render empty state
	if (queries.length === 0) {
		return (
			<div className="p-4">
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<FiDatabase
						size={36}
						className="text-gray-300 dark:text-gray-600 mb-3"
					/>
					<p className="text-gray-600 dark:text-gray-300 mb-1 font-medium">
						No saved queries found
					</p>
					<p className="text-gray-500 dark:text-gray-400 max-w-xs">
						Save a query using the save button to see it here.
					</p>
				</div>
			</div>
		);
	}

	// Render queries list
	return (
		<div className="p-4">
			{/* Search input */}
			<div className="relative mb-4">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<FiSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
				</div>
				<input
					className="bg-gray-100 dark:bg-gray-800 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-700 rounded-md py-2 pr-3 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
					type="text"
					placeholder="Search queries..."
					value={searchTerm}
					onChange={handleSearch}
				/>
			</div>

			{filteredQueries.length === 0 && (
				<p className="text-gray-500 dark:text-gray-400 py-4 text-center">
					No queries match your search.
				</p>
			)}

			<div className="space-y-3">
				{filteredQueries.map((query) => {
					const isActive = currentQueryName === query.name;

					return (
						<button
							key={query.name}
							type="button"
							onClick={() => onSelectQuery(query.sql, query.name)}
							aria-pressed={isActive}
							className={`w-full text-left overflow-hidden rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:shadow ${
								isActive
									? "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/30"
									: "border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
							}`}
						>
							<div className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
											{query.name}
										</h3>
										{query.description && (
											<p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
												{query.description}
											</p>
										)}
										<div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
											<FiClock className="mr-1.5 h-3 w-3 flex-shrink-0" />
											{formatDate(query.createdAt)}
										</div>
									</div>
									<div className="ml-4 flex-shrink-0 flex gap-2">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type="button"
														onClick={(e) => handleDeleteQuery(query.name, e)}
														className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
													>
														<span className="sr-only">Delete query</span>
														<FiTrash2 className="h-4 w-4" />
													</button>
												</TooltipTrigger>
												<TooltipContent>
													<p>Delete query</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default SavedQueriesList;

import type React from "react";
import { forwardRef, useState, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface TableListProps {
	tables: string[];
	openTables: string[];
	activeTable: string | null;
	tableSearch: string;
	setTableSearch: (search: string) => void;
	handleTableSelect: (table: string) => void;
}

const TableList = forwardRef<HTMLInputElement, TableListProps>(
	(
		{
			tables,
			openTables,
			activeTable,
			tableSearch,
			setTableSearch,
			handleTableSelect,
		},
		ref,
	) => {
		const [focusedIndex, setFocusedIndex] = useState<number>(-1);

		// Filter tables based on search
		const getFilteredTables = () => {
			if (!tableSearch.trim()) return tables;
			return tables.filter((table) =>
				table.toLowerCase().includes(tableSearch.toLowerCase()),
			);
		};

		const filteredTables = getFilteredTables();

		// Reset focus index when search changes or filtered list becomes empty
		useEffect(() => {
			setFocusedIndex(-1);
		}, [tableSearch, filteredTables.length]);

		// Use hotkeys for navigation instead of direct input keydown handler
		useHotkeys(
			"alt+up, option+up",
			(event) => {
				event.preventDefault();
				if (filteredTables.length === 0) return;
				setFocusedIndex((prevIndex) =>
					prevIndex <= 0 ? filteredTables.length - 1 : prevIndex - 1,
				);
			},
			{ enableOnFormTags: true },
		);

		useHotkeys(
			"alt+down, option+down",
			(event) => {
				event.preventDefault();
				if (filteredTables.length === 0) return;
				setFocusedIndex((prevIndex) =>
					prevIndex >= filteredTables.length - 1 ? 0 : prevIndex + 1,
				);
			},
			{ enableOnFormTags: true },
		);

		useHotkeys(
			"enter",
			(event) => {
				if (focusedIndex >= 0 && filteredTables.length > 0) {
					event.preventDefault();
					handleTableSelect(filteredTables[focusedIndex]);
				}
			},
			{ enableOnFormTags: true },
		);

		// We'll keep this for direct keyboard navigation when the input is focused
		const handleInputKeyDown = (
			event: React.KeyboardEvent<HTMLInputElement>,
		) => {
			// Only handle basic navigation keys here, not the alt+arrow combinations
			if (
				event.key === "Enter" &&
				focusedIndex >= 0 &&
				filteredTables.length > 0
			) {
				event.preventDefault();
				handleTableSelect(filteredTables[focusedIndex]);
			}
		};

		return (
			<div className="w-64 min-w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
				<div className="p-4 border-b border-gray-200 bg-gray-50">
					<h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
						Tables
					</h2>

					{/* Search Input */}
					<div className="mb-2 h-[30px]">
						<div>
							<input
								ref={ref}
								type="text"
								value={tableSearch}
								onChange={(e) => setTableSearch(e.target.value)}
								onKeyDown={handleInputKeyDown}
								placeholder="Search tables..."
								className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder-gray-400"
							/>
						</div>
					</div>
				</div>

				{/* Scrollable Table List */}
				<div
					className="overflow-y-auto p-4 pt-2 flex-1"
					style={{ maxHeight: "calc(100vh - 220px)" }}
				>
					<div className="space-y-0.5">
						{filteredTables.map((table, index) => (
							<button
								key={table}
								type="button"
								className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors
                ${openTables.includes(table) ? "text-blue-600" : "text-gray-700"}
                ${activeTable === table ? "bg-blue-100 text-blue-700 font-semibold" : "hover:bg-gray-100"}
                ${index === focusedIndex ? "ring-2 ring-blue-500 ring-offset-1 bg-blue-50" : ""}
                focus:outline-none focus:ring-2 focus:ring-blue-500`}
								onClick={() => handleTableSelect(table)}
							>
								{table}
							</button>
						))}

						{/* No Results Message */}
						{filteredTables.length === 0 && (
							<div className="text-center py-4 text-gray-500 text-sm">
								No tables found matching "{tableSearch}"
							</div>
						)}
					</div>
				</div>
			</div>
		);
	},
);

export default TableList;

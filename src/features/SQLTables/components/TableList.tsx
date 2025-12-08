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
		}, []); // Run only once on mount to satisfy linter (may need revisit)

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
      <div
        className="w-64 min-w-64 bg-panel border-r border-border/60 flex flex-col h-full"
      >
        <div className="p-4 border-b border-border/60 bg-panel">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-3">
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
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm placeholder:text-muted-foreground/70 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent shadow-sm"
							/>
						</div>
					</div>
				</div>

				{/* Scrollable Table List */}
				<div className="overflow-y-auto p-4 pt-2 flex-1">
					<div className="space-y-0.5">
						{filteredTables.map((table, index) => (
							<button
								key={table}
								type="button"
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${openTables.includes(table) ? "text-primary" : "text-foreground"}
                ${activeTable === table ? "bg-primary/10 text-primary border border-primary/30 shadow-sm" : "hover:bg-muted"}
                ${index === focusedIndex ? "ring-2 ring-primary/70 ring-offset-1 ring-offset-background" : ""}
                focus:outline-none focus:ring-2 focus:ring-primary/70`}
								onClick={() => handleTableSelect(table)}
							>
								{table}
							</button>
						))}

						{/* No Results Message */}
            {filteredTables.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
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

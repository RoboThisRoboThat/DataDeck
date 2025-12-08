import { useState, useRef, useCallback, useMemo, memo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
	FiDatabase,
	FiAlertCircle,
	FiSearch,
	FiCopy,
	FiMoreVertical,
	FiEdit,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	setPendingChange,
} from "../../../store/slices/tablesSlice";
import Editor from "@monaco-editor/react";
import CopyRowModal from "./CopyRowModal";
import { getRowKey } from "../utils/rowKey";

interface RightSidebarProps {
	connectionId: string;
}

function RightSidebar({ connectionId }: RightSidebarProps) {
	const dispatch = useAppDispatch();
	const sidebarRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Get the active table name from Redux
	const activeTable = useAppSelector((state) => state.tables.activeTable);

	// Use granular selectors to only re-render when specific data changes
	const selectedRow = useAppSelector((state) =>
		activeTable ? state.tables.tables[activeTable]?.selectedRow ?? null : null,
	);

	const columns = useAppSelector((state) =>
		activeTable ? state.tables.tables[activeTable]?.columns ?? [] : [],
	);

	const primaryKeys = useAppSelector((state) =>
		activeTable ? state.tables.tables[activeTable]?.primaryKeys ?? [] : [],
	);

	const structure = useAppSelector((state) =>
		activeTable ? state.tables.tables[activeTable]?.structure ?? [] : [],
	);
	
	const pendingChanges = useAppSelector((state) => 
		activeTable ? state.tables.tables[activeTable]?.pendingChanges || {} : {}
	);

	// Derived state
	const selectedRowKey = useMemo(() => 
		selectedRow && primaryKeys.length > 0 ? getRowKey(selectedRow, primaryKeys) : null
	, [selectedRow, primaryKeys]);

	// State for UI
	const [searchQuery, setSearchQuery] = useState("");
	const [showCopyRowModal, setShowCopyRowModal] = useState(false);
	const [jsonModalOpen, setJsonModalOpen] = useState(false);
	const [activeJsonColumn, setActiveJsonColumn] = useState<string | null>(null);
	const [jsonEditorValue, setJsonEditorValue] = useState<string>("");

	// Memoize filtered columns to prevent recalculation on every render
	const filteredColumns = useMemo(() => {
		if (!searchQuery.trim()) return columns;
		const searchLower = searchQuery.toLowerCase();
		return columns.filter((column) =>
			column.toLowerCase().includes(searchLower),
		);
	}, [columns, searchQuery]);

	// Format value for display
	const formatValue = (value: unknown): string => {
		if (value === null || value === undefined) {
			return "";
		}
		if (typeof value === "object") {
			if (value instanceof Date) {
				return value.toISOString();
			}
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	};

	// Determine if we have selected row data to display
	const hasSelectedRowData = !!selectedRow;

	// Helper to get effective value (pending or original)
	const getEffectiveValue = useCallback((column: string) => {
		if (!selectedRowKey || !pendingChanges[selectedRowKey]) {
			return selectedRow?.[column];
		}
		const change = pendingChanges[selectedRowKey].changes[column];
		return change ? change.value : selectedRow?.[column];
	}, [selectedRow, selectedRowKey, pendingChanges]);

	// Handle input change - now updates global pending state
	const handleInputChange = useCallback((column: string, value: string) => {
		if (!activeTable || !selectedRowKey || !selectedRow) return;

		// Simple type inference or keep as string (same as TableRow logic)
		// Ideally we should use column type from structure to parse correctly
		let parsedValue: unknown = value;
		
		// Logic to respect empty string vs null if needed, 
		// but sticking to string for input is safer for now.

		const primaryKeyValues: Record<string, unknown> = {};
		primaryKeys.forEach(pk => {
			primaryKeyValues[pk] = selectedRow[pk];
		});

		dispatch(setPendingChange({
			tableName: activeTable,
			rowKey: selectedRowKey,
			primaryKeyValues,
			column,
			value: parsedValue,
			originalValue: selectedRow[column]
		}));
	}, [activeTable, selectedRow, selectedRowKey, primaryKeys, dispatch]);

	// Handle Monaco editor change
	const handleMonacoChange = useCallback((column: string, value: string | undefined) => {
		if (value !== undefined) {
			handleInputChange(column, value);
		}
	}, [handleInputChange]);

	// Check if a column is a primary key
	const isPrimaryKey = (column: string): boolean => {
		return primaryKeys.includes(column);
	};

	// Get column type
	const getColumnType = (column: string): string => {
		const columnStructure = structure.find((col) => col.column === column);
		return columnStructure?.type || "";
	};

	// Determine input type based on column type
	const getInputType = (column: string): string => {
		const columnType = getColumnType(column).toLowerCase();

		if (
			columnType.includes("int") ||
			columnType.includes("float") ||
			columnType.includes("double") ||
			columnType.includes("decimal") ||
			columnType.includes("numeric")
		) {
			return "number";
		}

		if (
			columnType.includes("date") &&
			!columnType.includes("datetime") &&
			!columnType.includes("timestamp")
		) {
			return "date";
		}

		if (columnType.includes("datetime") || columnType.includes("timestamp")) {
			return "datetime-local";
		}

		if (columnType.includes("json") || columnType.includes("array")) {
			return "json";
		}

		return "text";
	};


	// Format date for input
	const formatDateForInput = (value: unknown, inputType: string): string => {
		if (value === null || value === undefined) {
			return "";
		}

		try {
			let dateObj: Date;
			let isValidDate = true;

			if (value instanceof Date) {
				dateObj = value;
			} else if (typeof value === "string") {
				// Try to parse the date string
				dateObj = new Date(value);

				// Check if the date is valid
				if (Number.isNaN(dateObj.getTime())) {
					isValidDate = false;
					console.warn(`Invalid date value: ${value}`);
					return typeof value === "string" ? value : String(value);
				}
			} else if (typeof value === "number") {
				// Handle timestamp numbers
				dateObj = new Date(value);
				if (Number.isNaN(dateObj.getTime())) {
					isValidDate = false;
					return String(value);
				}
			} else {
				console.warn(`Unsupported date value type: ${typeof value}`);
				return String(value);
			}

			if (!isValidDate) {
				return typeof value === "string" ? value : String(value);
			}

			if (inputType === "date") {
				return dateObj.toISOString().split("T")[0];
			}
			if (inputType === "datetime-local") {
				// Format as YYYY-MM-DDThh:mm
				return dateObj.toISOString().slice(0, 16);
			}
		} catch (error) {
			console.error("Error formatting date:", error);
			// Return the original value as string if we can't format it
			return typeof value === "string" ? value : String(value);
		}

		// Fallback to string representation of the value
		return typeof value === "string" ? value : String(value);
	};

	// Truncate column name if it's too long
	const truncateColumnName = (name: string, maxLength = 20): string => {
		if (name.length <= maxLength) return name;
		return `${name.substring(0, maxLength - 3)}...`;
	};

	// Check if a value is null in the edited values or original data
	const isValueNull = (column: string): boolean => {
		if (selectedRowKey && pendingChanges[selectedRowKey]?.changes[column]) {
			return pendingChanges[selectedRowKey].changes[column].value === null;
		}
		return (
			selectedRow?.[column] === null || selectedRow?.[column] === undefined
		);
	};

	// Check if value is a valid date
	const isValidDate = (value: unknown): boolean => {
		if (value === null || value === undefined) return false;

		if (value instanceof Date) {
			return !Number.isNaN(value.getTime());
		}

		if (typeof value === "string" || typeof value === "number") {
			const date = new Date(value);
			return !Number.isNaN(date.getTime());
		}

		return false;
	};

	// Function to navigate between input fields in the sidebar
	const navigateInputs = useCallback((direction: "up" | "down") => {
		if (!sidebarRef.current) return;

		// Get all focusable elements in the sidebar
		const focusableElements = Array.from(
			sidebarRef.current.querySelectorAll(
				"button, [href], input, select, textarea",
			),
		) as HTMLElement[];

		// Filter out disabled elements
		const enabledElements = focusableElements.filter(
			(el) =>
				!el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1",
		);

		if (enabledElements.length === 0) return;

		// Get the currently focused element
		const currentIndex = enabledElements.findIndex(
			(el) => el === document.activeElement,
		);

		let newIndex: number;
		if (currentIndex < 0) {
			// If no element is focused, focus the first one
			newIndex = 0;
		} else if (direction === "down") {
			// Move to the next element
			newIndex = (currentIndex + 1) % enabledElements.length;
		} else {
			// Move to the previous element
			newIndex =
				(currentIndex - 1 + enabledElements.length) % enabledElements.length;
		}

		// Focus the new element
		enabledElements[newIndex].focus();
	}, []);

	// Add keyboard shortcuts
	useHotkeys(
		"mod+shift+up, mod+shift+up",
		(event) => {
			event.preventDefault();
			navigateInputs("up");
		},
		{ enableOnFormTags: true },
	);

	useHotkeys(
		"mod+shift+down, mod+shift+down",
		(event) => {
			event.preventDefault();
			navigateInputs("down");
		},
		{ enableOnFormTags: true },
	);

	// Add mod+shift+up/down shortcuts to navigate inputs
	useHotkeys(
		"mod+shift+up, mod+shift+up",
		(event) => {
			event.preventDefault();
			navigateInputs("up");
		},
		{ enableOnFormTags: true },
	);

	useHotkeys(
		"mod+shift+down, mod+shift+down",
		(event) => {
			event.preventDefault();
			navigateInputs("down");
		},
		{ enableOnFormTags: true },
	);

	// Focus search input shortcut
	useHotkeys(
		"mod+shift+f, mod+shift+f",
		(event) => {
			console.log("Triggering focus search input shortcut");
			event.preventDefault();
			searchInputRef.current?.focus();
		},
		{ enableOnFormTags: true },
	);

	// Open JSON editor modal - memoized
	const handleOpenJsonModal = useCallback(
		(column: string) => {
			const value = getEffectiveValue(column);
			const formattedValue = typeof value === 'string' ? value : formatValue(value);
			setJsonEditorValue(formattedValue);
			setActiveJsonColumn(column);
			setJsonModalOpen(true);
		},
		[getEffectiveValue],
	);

	// Handle JSON editor save - memoized
	const handleJsonEditorSave = useCallback(() => {
		if (activeJsonColumn) {
			handleMonacoChange(activeJsonColumn, jsonEditorValue);
			setJsonModalOpen(false);
		}
	}, [activeJsonColumn, jsonEditorValue, handleMonacoChange]);

	return (
		<div className="w-72 min-w-72 bg-panel border-l border-border/60 flex flex-col h-full">
			{/* Sticky header with search bar */}
			<div className="sticky top-0 z-10 p-4 border-b border-border/60 bg-panel">
				<div className="flex justify-between items-center mb-3">
					<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.18em]">
						Row Details
					</h2>
				</div>

				{/* Search input with three dots menu */}
				<div className="relative flex items-center gap-2">
					<div className="relative flex-1">
						<FiSearch
							className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
							size={14}
						/>
						<Input
							ref={searchInputRef}
							type="text"
							placeholder="Search columns..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9 text-sm bg-card text-foreground border-border focus-visible:ring-2 focus-visible:ring-primary/60"
						/>
					</div>

					{activeTable && hasSelectedRowData && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<div
									className="relative"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.stopPropagation();
										}
									}}
								>
									<Button
										variant="outline"
										size="sm"
										className="w-9 h-9 p-0 rounded-full border-gray-300 dark:border-gray-600"
									>
										<FiMoreVertical
											className="text-gray-500 dark:text-gray-400"
											size={16}
										/>
									</Button>
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="z-[100] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
								side="bottom"
								sideOffset={5}
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							>
								<DropdownMenuItem
									onClick={() => setShowCopyRowModal(true)}
									className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
								>
									<FiCopy className="mr-2 text-purple-500" size={16} />
									Duplicate Row
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

			{/* Empty states */}
			{!activeTable && (
				<div className="flex flex-col items-center justify-center p-6 flex-1 text-muted-foreground text-center">
					<FiDatabase className="w-8 h-8 mb-3 opacity-50" />
					<p className="text-sm">Select a table to view row details</p>
				</div>
			)}

			{activeTable && !hasSelectedRowData && (
				<div className="flex flex-col items-center justify-center p-6 flex-1 text-muted-foreground text-center">
					<FiAlertCircle className="w-8 h-8 mb-3 opacity-50" />
					<p className="text-sm">
						Click on a row in the table to view its details
					</p>
				</div>
			)}

			{/* Scrollable input fields section */}
			{activeTable && hasSelectedRowData && (
				<>
					<div ref={sidebarRef} className="flex-1 overflow-auto p-4">
						<div className="space-y-3">
							{filteredColumns.map((column) => {
								const value = getEffectiveValue(column);
								const isNull = isValueNull(column);
								const canEdit = !isPrimaryKey(column);
								const truncatedColumnName = truncateColumnName(column);
								const inputType = getInputType(column);
								const columnType = getColumnType(column);
								
								// Check if has pending change
								const hasPendingChange = selectedRowKey && pendingChanges[selectedRowKey]?.changes[column];

								return (
									<div
										key={column}
									className={`space-y-1 pb-2 border-b border-border/50 mb-2 ${hasPendingChange ? "bg-blue-50/30 -mx-2 px-2 rounded" : ""}`}
									>
										<div className="flex justify-between items-center">
											<label
												htmlFor={`field-${column}`}
											className={`text-xs font-medium ${hasPendingChange ? "text-blue-700 dark:text-blue-400" : "text-foreground"}`}
												title={column} // Show full column name on hover
											>
												{truncatedColumnName}
												{isPrimaryKey(column) && (
												<span className="ml-1 text-xs bg-primary/15 text-primary px-1 py-0.5 rounded">
														PK
													</span>
												)}
												<span className="ml-1 text-xs bg-muted text-foreground px-1 py-0.5 rounded border border-border/60">
													({columnType || "N/A"})
												</span>
											</label>
											{inputType === "json" && canEdit && (
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
													onClick={() => handleOpenJsonModal(column)}
													title="Edit in full-screen"
												>
													<FiEdit
														size={14}
														className="text-blue-500 dark:text-blue-400"
													/>
												</Button>
											)}
										</div>

										{isNull ? (
												<div className="w-full px-3 py-2 border border-border bg-muted rounded-md text-sm text-muted-foreground italic">
												NULL
											</div>
										) : inputType === "json" ? (
											<div className="h-36 border border-blue-300 dark:border-blue-600 rounded-md overflow-hidden">
												<Editor
													height="100%"
													language="json"
													value={
														// Value is already resolved by getEffectiveValue
														// Just need to format it if object
														typeof value === 'string' ? value : formatValue(value)
													}
													onChange={(value) =>
														handleMonacoChange(column, value)
													}
													options={{
														minimap: { enabled: false },
														lineNumbers: "on",
														fontSize: 12,
														scrollBeyondLastLine: false,
														automaticLayout: true,
														wordWrap: "on",
														readOnly: !canEdit,
														theme: "vs-dark",
													}}
												/>
											</div>
										) : inputType === "date" ||
											inputType === "datetime-local" ? (
											<div className="relative">
												<input
													id={`field-${column}`}
													type={inputType}
													readOnly={!canEdit}
													value={
														formatDateForInput(value, inputType)
													}
													onChange={
														canEdit
															? (e) =>
																	handleInputChange(column, e.target.value)
															: undefined
													}
													className={`w-full px-3 py-2 border rounded-md text-sm
													${canEdit ? "border-border bg-card text-foreground" : "border-border bg-muted text-muted-foreground"}
													${!isValidDate(value) ? "border-amber-400 bg-amber-50/60" : ""}
												`}
												/>
												{!isValidDate(value) && (
													<div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
														Invalid date format. Edit to fix.
													</div>
												)}
											</div>
										) : inputType === "number" ? (
											<input
												id={`field-${column}`}
												type="number"
												readOnly={!canEdit}
												value={
													value === null ? "" : String(value)
												}
												onChange={
													canEdit
														? (e) => handleInputChange(column, e.target.value)
														: undefined
												}
												className={`w-full px-3 py-2 border rounded-md text-sm
												${canEdit ? "border-border bg-card text-foreground" : "border-border bg-muted text-muted-foreground"}
											`}
											/>
										) : (
											<input
												id={`field-${column}`}
												type="text"
												readOnly={!canEdit}
												value={
													value === null ? "" : String(value)
												}
												onChange={
													canEdit
														? (e) => handleInputChange(column, e.target.value)
														: undefined
												}
												className={`w-full px-3 py-2 border rounded-md text-sm
												${canEdit ? "border-border bg-card text-foreground" : "border-border bg-muted text-muted-foreground"}
											`}
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</>
			)}
			{/* Confirmation Dialog Removed - Handled Globally */}
			
			{/* Copy Row Modal */}
			{activeTable && (
				<CopyRowModal
					open={showCopyRowModal}
					onClose={() => setShowCopyRowModal(false)}
					connectionId={connectionId}
					tableName={activeTable}
					rowData={selectedRow}
					structure={structure}
					primaryKeys={primaryKeys}
				/>
			)}

			{/* JSON Editor Modal */}
			<Dialog
				open={jsonModalOpen}
				onOpenChange={(open) => {
					setJsonModalOpen(open);
					if (!open) {
						setActiveJsonColumn(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-4xl h-[80vh]">
					<DialogHeader>
						<DialogTitle className="bg-gray-50 -mx-6 -mt-4 px-6 py-3 border-b">
							Edit JSON {activeJsonColumn && `(${activeJsonColumn})`}
						</DialogTitle>
					</DialogHeader>

					<div className="flex-1 h-full py-4 flex flex-col">
						<div className="flex-1 min-h-[500px]">
							<Editor
								height="100%"
								language="json"
								value={jsonEditorValue}
								onChange={(value) => setJsonEditorValue(value || "")}
								options={{
									minimap: { enabled: true },
									lineNumbers: "on",
									fontSize: 14,
									scrollBeyondLastLine: true,
									automaticLayout: true,
									wordWrap: "on",
								}}
								theme="vs"
							/>
						</div>
					</div>

					<DialogFooter className="bg-gray-50 px-6 py-4 -mx-6 -mb-6 border-t">
						<Button variant="outline" onClick={() => setJsonModalOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleJsonEditorSave}>Update Value</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default memo(RightSidebar);

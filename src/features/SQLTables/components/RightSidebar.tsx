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
	FiTrash2,
	FiRotateCcw,
	FiRefreshCcw,
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
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { setPendingChange } from "../../../store/slices/tablesSlice";
import Editor from "@monaco-editor/react";
import CopyRowModal from "./CopyRowModal";
import { getRowKey } from "../utils/rowKey";
import { useTheme } from "@/context/ThemeContext";

interface RightSidebarProps {
	connectionId: string;
}

function RightSidebar({ connectionId }: RightSidebarProps) {
	const {theme} = useTheme();
	const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
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
		activeTable ? state.tables.tables[activeTable]?.pendingChanges || {} : {},
	);

	// Derived state
	const selectedRowKey = useMemo(
		() =>
			selectedRow && primaryKeys.length > 0
				? getRowKey(selectedRow, primaryKeys)
				: null,
		[selectedRow, primaryKeys],
	);

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
	const getEffectiveValue = useCallback(
		(column: string) => {
			if (!selectedRowKey || !pendingChanges[selectedRowKey]) {
				return selectedRow?.[column];
			}
			const change = pendingChanges[selectedRowKey].changes[column];
			return change ? change.value : selectedRow?.[column];
		},
		[selectedRow, selectedRowKey, pendingChanges],
	);

	// Handle input change - now updates global pending state
	const handleInputChange = useCallback(
		(column: string, value: unknown) => {
			if (!activeTable || !selectedRowKey || !selectedRow) return;

			const primaryKeyValues: Record<string, unknown> = {};
			primaryKeys.forEach((pk) => {
				primaryKeyValues[pk] = selectedRow[pk];
			});

			dispatch(
				setPendingChange({
					tableName: activeTable,
					rowKey: selectedRowKey,
					primaryKeyValues,
					column,
					value: value,
					originalValue: selectedRow[column],
				}),
			);
		},
		[activeTable, selectedRow, selectedRowKey, primaryKeys, dispatch],
	);

	// Handle Monaco editor change
	const handleMonacoChange = useCallback(
		(column: string, value: string | undefined) => {
			if (value !== undefined) {
				handleInputChange(column, value);
			}
		},
		[handleInputChange],
	);

	// Check if a column is a primary key
	const isPrimaryKey = (column: string): boolean => {
		return primaryKeys.includes(column);
	};

	// Get column type
	const getColumnType = (column: string): string => {
		const columnStructure = structure.find((col) => col.column === column);
		return columnStructure?.type || "";
	};
	
	const getColumnEnumValues = (column: string): string[] | undefined => {
		const columnStructure = structure.find((col) => col.column === column);
		return columnStructure?.enumValues;
	};

	const getColumnDefaultValue = (column: string): unknown => {
		const columnStructure = structure.find((col) => col.column === column);
		return columnStructure?.defaultValue;
	};

	// Determine input type based on column type
	const getInputType = (column: string): string => {
		const columnType = getColumnType(column).toLowerCase();
		const enumValues = getColumnEnumValues(column);

		if (enumValues && enumValues.length > 0) {
			return "enum";
		}

		if (
			columnType.includes("int") ||
			columnType.includes("float") ||
			columnType.includes("double") ||
			columnType.includes("decimal") ||
			columnType.includes("numeric")
		) {
			return "number";
		}

		if (columnType.includes("json") || columnType.includes("array")) {
			return "json";
		}

		// Default to text for dates and strings as requested
		return "text";
	};

	// Truncate column name if it's too long
	const truncateColumnName = (name: string, maxLength = 20): string => {
		if (name.length <= maxLength) return name;
		return `${name.substring(0, maxLength - 3)}...`;
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
			const formattedValue =
				typeof value === "string" ? value : formatValue(value);
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
								const isNull = value === null;
								const canEdit = !isPrimaryKey(column);
								const truncatedColumnName = truncateColumnName(column);
								const inputType = getInputType(column);
								const columnType = getColumnType(column);
								const enumValues = getColumnEnumValues(column);
								const defaultValue = getColumnDefaultValue(column);

								// Check if has pending change
								const hasPendingChange =
									selectedRowKey && pendingChanges[selectedRowKey]?.changes[column];

								return (
									<div
										key={column}
										className={`space-y-1 pb-2 border-b border-border/50 mb-2 ${hasPendingChange ? "bg-blue-50/30 -mx-2 px-2 rounded" : ""}`}
									>
										<div className="flex justify-between items-center">
											<div className="flex items-center gap-1 overflow-hidden">
												<label
													htmlFor={`field-${column}`}
													className={`text-xs font-medium truncate ${hasPendingChange ? "text-blue-700 dark:text-blue-400" : "text-foreground"}`}
													title={column}
												>
													{truncatedColumnName}
												</label>
												{isPrimaryKey(column) && (
													<span className="flex-shrink-0 text-xs bg-primary/15 text-primary px-1 py-0.5 rounded">
														PK
													</span>
												)}
												<span className="flex-shrink-0 text-xs bg-muted text-foreground px-1 py-0.5 rounded border border-border/60">
													({columnType || "N/A"})
												</span>
											</div>
											
											{canEdit && (
												<div className="flex items-center">
													{inputType === "json" && (
														<Button
															variant="ghost"
															size="sm"
															className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 mr-1"
															onClick={() => handleOpenJsonModal(column)}
															title="Edit in full-screen"
														>
															<FiEdit
																size={14}
																className="text-blue-500 dark:text-blue-400"
															/>
														</Button>
													)}
													
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
															>
																<FiMoreVertical size={14} />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() => handleInputChange(column, null)}
																disabled={isNull}
															>
																<FiTrash2 className="mr-2 h-4 w-4" />
																Set to NULL
															</DropdownMenuItem>
															{inputType === "text" && (
																<DropdownMenuItem
																	onClick={() => handleInputChange(column, "")}
																>
																	<FiEdit className="mr-2 h-4 w-4" />
																	Set to Empty String
																</DropdownMenuItem>
															)}
															{defaultValue !== undefined && (
																<DropdownMenuItem
																	onClick={() => handleInputChange(column, defaultValue)}
																>
																	<FiRefreshCcw className="mr-2 h-4 w-4" />
																	Set to Default
																</DropdownMenuItem>
															)}
															<DropdownMenuSeparator />
															{/* Revert Change */}
															{hasPendingChange && (
																<DropdownMenuItem
																	onClick={() => {
																		// Just setting to original value essentially reverts it
																		// Or we could implement discardPendingChange specific to column
																		// For now, re-set to original
																		handleInputChange(column, selectedRow[column]);
																	}}
																>
																	<FiRotateCcw className="mr-2 h-4 w-4" />
																	Revert Change
																</DropdownMenuItem>
															)}
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											)}
										</div>

										{/* Render Input based on type */}
										{inputType === "enum" && enumValues ? (
											<Select
												disabled={!canEdit}
												value={isNull ? "" : String(value)}
												onValueChange={(val) => handleInputChange(column, val)}
											>
												<SelectTrigger className="w-full h-8 text-sm">
													<SelectValue placeholder={isNull ? "NULL" : "Select value"} />
												</SelectTrigger>
												<SelectContent>
													{enumValues.map((enumVal) => (
														<SelectItem key={enumVal} value={enumVal}>
															{enumVal}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : inputType === "json" ? (
											<div className="h-36 border border-blue-300 dark:border-blue-600 rounded-md overflow-hidden">
												<Editor
													height="100%"
													language="json"
													value={
														typeof value === "string" ? value : formatValue(value)
													}
													onChange={(value) =>
														handleMonacoChange(column, value)
													}
													options={{
														minimap: { enabled: false },
														fontSize: 12,
														scrollBeyondLastLine: false,
														automaticLayout: true,
														wordWrap: "on",
														readOnly: !canEdit,
													}}
													theme={monacoTheme}
												/>
											</div>
										) : (
											<div className="relative">
												<Input
													id={`field-${column}`}
													type={inputType === "number" ? "number" : "text"}
													readOnly={!canEdit}
													value={isNull ? "" : String(value)}
													placeholder={isNull ? "NULL" : ""}
													onChange={(e) =>
														handleInputChange(column, e.target.value)
													}
													className={`w-full px-3 py-2 border rounded-md text-sm h-9
													${canEdit ? "border-border bg-card text-foreground" : "border-border bg-muted text-muted-foreground"}
													${isNull ? "italic text-muted-foreground placeholder:text-muted-foreground/70" : ""}
												`}
												/>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</>
			)}

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
						<DialogTitle
							className={`-mx-6 -mt-4 px-6 py-3 border-b 
								${theme === "dark" 
									? "bg-zinc-900 text-gray-100 border-zinc-800"
									: "bg-gray-50 text-gray-900 border-gray-200"
								}
							`}
						>
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
								theme={monacoTheme}
							/>
						</div>
					</div>

					<DialogFooter
						className={`px-6 py-4 -mx-6 -mb-6 border-t
							${theme === "dark"
								? "bg-zinc-900 border-zinc-800"
								: "bg-gray-50 border-gray-200"
							}
						`}
					>
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

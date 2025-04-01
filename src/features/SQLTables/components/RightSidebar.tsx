import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
	FiDatabase,
	FiAlertCircle,
	FiSave,
	FiSearch,
	FiCopy,
	FiMoreVertical,
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
	fetchTableData,
	setSelectedRow,
} from "../../../store/slices/tablesSlice";
import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import CopyRowModal from "./CopyRowModal";

interface RightSidebarProps {
	connectionId: string;
}

function RightSidebar({ connectionId }: RightSidebarProps) {
	const dispatch = useAppDispatch();

	// Get the active table name from Redux
	const activeTable = useAppSelector((state) => state.tables.activeTable);

	// Get the selected row data and columns for the active table
	const tableState = useAppSelector((state) =>
		activeTable ? state.tables.tables[activeTable] : null,
	);

	const selectedRow = tableState?.selectedRow || null;
	const columns = tableState?.columns || [];
	const primaryKeys = tableState?.primaryKeys || [];
	const structure = tableState?.structure || [];
	// State for editing mode - always in edit mode
	const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [showCopyRowModal, setShowCopyRowModal] = useState(false);
	// Monaco instance for future extensions (monaco editor customization)
	// TODO: Use this when implementing custom editor features
	// const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);

	// Filter columns based on search query
	const filteredColumns = columns.filter((column) =>
		column.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// Reset edited values when selected row changes
	useEffect(() => {
		if (selectedRow) {
			// Only reset when we have a new row
			setEditedValues({});
		}
	}, [selectedRow]);

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

	// Check if the value is a JSON object or array
	const isJsonValue = (value: unknown): boolean => {
		return (
			typeof value === "object" && value !== null && !(value instanceof Date)
		);
	};

	// Determine if we have selected row data to display
	const hasSelectedRowData = !!selectedRow;

	// Handle input change
	const handleInputChange = (column: string, value: string) => {
		setEditedValues((prev) => ({
			...prev,
			[column]: value,
		}));
	};

	// Handle Monaco editor change
	const handleMonacoChange = (column: string, value: string | undefined) => {
		if (value !== undefined) {
			setEditedValues((prev) => ({
				...prev,
				[column]: value,
			}));
		}
	};

	// Handle save button click
	const handleSaveClick = () => {
		if (Object.keys(editedValues).length === 0) {
			// Nothing to save
			return;
		}

		setShowConfirmModal(true);
	};

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
			} else if (inputType === "datetime-local") {
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

	// Parse value according to original type
	const parseValue = (column: string, value: string | null): unknown => {
		if (!selectedRow) return value;
		if (value === null) return null;

		const originalValue = selectedRow[column];
		const columnType = getColumnType(column).toLowerCase();

		// If value is empty string and not a string type, return null
		if (
			value === "" &&
			!columnType.includes("char") &&
			!columnType.includes("text")
		) {
			return null;
		}

		// Handle different data types
		if (
			columnType.includes("int") ||
			columnType.includes("float") ||
			columnType.includes("double") ||
			columnType.includes("decimal") ||
			columnType.includes("numeric")
		) {
			const parsedNumber = Number(value);
			if (!Number.isNaN(parsedNumber)) return parsedNumber;
			return value === "" ? null : value;
		}

		// Handle date and datetime types
		if (
			columnType.includes("date") ||
			columnType.includes("timestamp") ||
			columnType.includes("time")
		) {
			// For empty strings, return null for date fields
			if (value === "") return null;

			try {
				// Try to create a valid date
				const dateObj = new Date(value);

				// Check if date is valid
				if (!Number.isNaN(dateObj.getTime())) {
					// Return ISO string for timestamp/datetime or just the date part for date
					if (
						columnType.includes("timestamp") ||
						columnType.includes("datetime")
					) {
						return dateObj.toISOString();
					}

					if (columnType.includes("date")) {
						return dateObj.toISOString().split("T")[0];
					}

					if (columnType.includes("time")) {
						return dateObj.toISOString().split("T")[1].split(".")[0];
					}
				}

				// If we couldn't parse it as a date, return the original string
				return value;
			} catch (e) {
				console.warn(`Failed to parse date value: ${value}`, e);
				return value;
			}
		}

		// If original value is a boolean, parse as boolean
		if (typeof originalValue === "boolean") {
			if (value.toLowerCase() === "true") return true;
			if (value.toLowerCase() === "false") return false;
		}

		// If it's a JSON type, parse as JSON
		if (columnType.includes("json") || columnType.includes("array")) {
			try {
				return JSON.parse(value);
			} catch (e) {
				// Return as is if parsing fails
				return value;
			}
		}

		// Return as string for all other cases
		return value;
	};

	// Save changes to the database
	const saveChanges = async () => {
		if (!selectedRow || !activeTable || primaryKeys.length === 0) return;

		setLoading(true);
		setError(null);

		try {
			// Get primary key column and value
			const primaryKeyColumn = primaryKeys[0];
			const primaryKeyValue = selectedRow[primaryKeyColumn];

			// Check if primary key value is a string or number
			if (
				typeof primaryKeyValue !== "string" &&
				typeof primaryKeyValue !== "number"
			) {
				throw new Error("Primary key value must be a string or number");
			}

			// Update each changed field
			for (const [column, value] of Object.entries(editedValues)) {
				// Skip primary key columns
				if (isPrimaryKey(column)) continue;

				// Parse the value according to its original type
				const parsedValue =
					value === null ? null : parseValue(column, value as string);

				try {
					// Dispatch update action but handle errors locally
					await window.database.updateCell(
						connectionId,
						activeTable,
						primaryKeyColumn,
						primaryKeyValue,
						column,
						parsedValue,
					);
				} catch (err) {
					// Extract the full error message from the API error
					const errorMessage =
						err instanceof Error
							? err.message
							: typeof err === "object" && err && "message" in err
								? String(err.message)
								: "Failed to save changes";

					// If the error contains the full API error message, extract it
					const match = errorMessage.match(
						/Error invoking remote method '[^']+': (.+)/,
					);
					throw new Error(match ? match[1] : errorMessage);
				}
			}

			// After successful save, refetch the table data
			if (tableState) {
				const { filters, sortConfig, pagination } = tableState;
				const response = await dispatch(
					fetchTableData({
						tableName: activeTable,
						connectionId,
						filters,
						sortConfig,
						pagination,
					}),
				).unwrap();

				// Find the updated row in the new data using the primary key
				const updatedRow = response.data.find(
					(row) => row[primaryKeyColumn] === primaryKeyValue,
				);

				// Update the selected row with the new data
				if (updatedRow) {
					dispatch(
						setSelectedRow({
							tableName: activeTable,
							selectedRow: updatedRow,
						}),
					);
				}
			}

			// Reset state after successful save
			setEditedValues({});
			setShowConfirmModal(false);
		} catch (err) {
			// Set the full error message
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	// Handle Monaco editor initialization
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const handleEditorDidMount = (_editor: unknown, _monaco: Monaco) => {
		// We may use this in the future for customizing the editor
	};

	// Render the changes for confirmation
	const renderChanges = () => {
		return Object.entries(editedValues)
			.map(([column, newValue]) => {
				if (!selectedRow) return null;

				const originalValue = selectedRow[column];
				const formattedOriginal = formatValue(originalValue);
				const formattedNew =
					newValue === null
						? "NULL"
						: typeof newValue === "string"
							? newValue
							: formatValue(newValue);

				// Skip unchanged values
				if (
					(originalValue === null && newValue === null) ||
					(formattedOriginal === formattedNew && originalValue !== null)
				) {
					return null;
				}

				return (
					<div key={column} className="mb-3 pb-3 border-b border-gray-100">
						<h4 className="font-medium text-gray-700">{column}</h4>
						<div className="grid grid-cols-2 gap-2 mt-1">
							<div className="text-sm">
								<span className="text-gray-500 block text-xs">Original:</span>
								<div className="bg-gray-50 p-1 rounded mt-1 max-h-20 overflow-auto">
									{originalValue === null || originalValue === undefined ? (
										<span className="text-gray-400 italic">NULL</span>
									) : isJsonValue(originalValue) ? (
										<pre className="text-xs">{formattedOriginal}</pre>
									) : (
										formattedOriginal
									)}
								</div>
							</div>
							<div className="text-sm">
								<span className="text-gray-500 block text-xs">New:</span>
								<div className="bg-blue-50 p-1 rounded mt-1 max-h-20 overflow-auto">
									{newValue === null ? (
										<span className="text-gray-400 italic">NULL</span>
									) : isJsonValue(originalValue) &&
										typeof newValue === "string" ? (
										<pre className="text-xs">{newValue}</pre>
									) : (
										formattedNew
									)}
								</div>
							</div>
						</div>
					</div>
				);
			})
			.filter(Boolean);
	};

	// Calculate if there are any actual changes
	const hasChanges = (): boolean => {
		if (!selectedRow) return false;

		return Object.entries(editedValues).some(([column, newValue]) => {
			const originalValue = selectedRow[column];

			// Handle null values
			if (originalValue === null && newValue === null) return false;
			if (originalValue === null && newValue !== null) return true;
			if (originalValue !== null && newValue === null) return true;

			const formattedOriginal = formatValue(originalValue);
			const formattedNew =
				typeof newValue === "string" ? newValue : formatValue(newValue);

			return formattedOriginal !== formattedNew;
		});
	};

	// Truncate column name if it's too long
	const truncateColumnName = (name: string, maxLength = 20): string => {
		if (name.length <= maxLength) return name;
		return `${name.substring(0, maxLength - 3)}...`;
	};

	// Check if a value is null in the edited values or original data
	const isValueNull = (column: string): boolean => {
		if (column in editedValues) {
			return editedValues[column] === null;
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

	return (
		<div className="w-72 min-w-72 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
			<div className="p-4 border-b border-gray-200 bg-gray-50">
				<div className="flex justify-between items-center mb-3">
					<h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
						Row Details
					</h2>
				</div>

				{/* Search input with three dots menu */}
				<div className="relative flex items-center gap-2">
					<div className="relative flex-1">
						<FiSearch
							className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
							size={14}
						/>
						<Input
							type="text"
							placeholder="Search columns..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9 text-sm"
						/>
					</div>

					{activeTable && hasSelectedRowData && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="w-9 h-9 p-0 rounded-full"
								>
									<FiMoreVertical className="text-gray-500" size={16} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setShowCopyRowModal(true)}>
									<FiCopy className="mr-2 text-purple-500" size={16} />
									Duplicate Row
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

			{!activeTable && (
				<div className="flex flex-col items-center justify-center p-6 h-full text-gray-500 text-center">
					<FiDatabase className="w-8 h-8 mb-3 opacity-50" />
					<p className="text-sm">Select a table to view row details</p>
				</div>
			)}

			{activeTable && !hasSelectedRowData && (
				<div className="flex flex-col items-center justify-center p-6 h-full text-gray-500 text-center">
					<FiAlertCircle className="w-8 h-8 mb-3 opacity-50" />
					<p className="text-sm">
						Click on a row in the table to view its details
					</p>
				</div>
			)}

			{activeTable && hasSelectedRowData && (
				<>
					<div className="flex-1 p-4 overflow-auto">
						<div className="space-y-3">
							{filteredColumns.map((column) => {
								const value = selectedRow[column];
								const isNull = isValueNull(column);
								const canEdit = !isPrimaryKey(column);
								const truncatedColumnName = truncateColumnName(column);
								const inputType = getInputType(column);
								const columnType = getColumnType(column);

								return (
									<div
										key={column}
										className="space-y-1 pb-2 border-b border-gray-100 mb-2"
									>
										<div className="flex justify-between items-center">
											<label
												htmlFor={`field-${column}`}
												className="text-xs font-medium text-gray-700"
												title={column} // Show full column name on hover
											>
												{truncatedColumnName}
												{isPrimaryKey(column) && (
													<span className="ml-1 text-xs bg-blue-200 text-blue-800 px-1 py-0.5 rounded">
														PK
													</span>
												)}
												<span className="ml-1 text-xs bg-gray-200 text-gray-700 px-1 py-0.5 rounded">
													({columnType || "N/A"})
												</span>
											</label>
										</div>

										{isNull ? (
											<div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm text-gray-400 italic">
												NULL
											</div>
										) : inputType === "json" ? (
											<div className="h-36 border border-blue-300 rounded-md overflow-hidden">
												<Editor
													height="100%"
													language="json"
													value={
														column in editedValues &&
														editedValues[column] !== null
															? (editedValues[column] as string)
															: formatValue(value)
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
													}}
													onMount={handleEditorDidMount}
													theme="vs"
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
														column in editedValues &&
														editedValues[column] !== null
															? (editedValues[column] as string)
															: formatDateForInput(value, inputType)
													}
													onChange={
														canEdit
															? (e) => handleInputChange(column, e.target.value)
															: undefined
													}
													className={`w-full px-3 py-2 border rounded-md text-sm
														${canEdit ? "border-blue-300 bg-white" : "border-gray-300 bg-gray-50"}
														${!isValidDate(value) && !(column in editedValues) ? "border-orange-300 bg-orange-50" : ""}
													`}
												/>
												{!isValidDate(value) && !(column in editedValues) && (
													<div className="text-xs text-orange-600 mt-1">
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
													column in editedValues &&
													editedValues[column] !== null
														? (editedValues[column] as string)
														: formatValue(value)
												}
												onChange={
													canEdit
														? (e) => handleInputChange(column, e.target.value)
														: undefined
												}
												className={`w-full px-3 py-2 border rounded-md text-sm
													${canEdit ? "border-blue-300 bg-white" : "border-gray-300 bg-gray-50"}
												`}
											/>
										) : (
											<input
												id={`field-${column}`}
												type="text"
												readOnly={!canEdit}
												value={
													column in editedValues &&
													editedValues[column] !== null
														? (editedValues[column] as string)
														: formatValue(value)
												}
												onChange={
													canEdit
														? (e) => handleInputChange(column, e.target.value)
														: undefined
												}
												className={`w-full px-3 py-2 border rounded-md text-sm
													${canEdit ? "border-blue-300 bg-white" : "border-gray-300 bg-gray-50"}
												`}
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{/* Fixed save button at the bottom */}
					{primaryKeys.length > 0 && (
						<div className="sticky bottom-0 p-3 bg-gray-50 border-t border-gray-200 flex justify-center">
							<Button
								variant="default"
								className="w-full"
								onClick={handleSaveClick}
								disabled={!hasChanges() || loading}
							>
								<FiSave className="mr-2" size={16} />
								{loading ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					)}
				</>
			)}

			{/* Confirmation Dialog */}
			<Dialog
				open={showConfirmModal}
				onOpenChange={(open) => {
					setShowConfirmModal(open);
					if (!open) {
						setError(null); // Clear error when dialog is closed
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="bg-gray-50 -mx-6 -mt-4 px-6 py-3 border-b">
							{error ? "Error" : "Confirm Changes"}
						</DialogTitle>
					</DialogHeader>

					<div className="py-4">
						{error ? (
							<div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
								{error}
							</div>
						) : (
							<>
								<h3 className="text-sm font-medium mb-3">
									The following fields will be updated:
								</h3>

								<div className="max-h-[300px] overflow-y-auto">
									{hasChanges() ? (
										renderChanges()
									) : (
										<p className="text-gray-500 text-center py-4">
											No changes detected
										</p>
									)}
								</div>
							</>
						)}
					</div>

					<DialogFooter className="bg-gray-50 px-6 py-4 -mx-6 -mb-6 border-t">
						<Button
							variant="outline"
							onClick={() => {
								setShowConfirmModal(false);
								setError(null); // Clear error when dialog is closed
							}}
							disabled={loading}
						>
							{error ? "Close" : "Cancel"}
						</Button>
						{!error && (
							<Button
								onClick={saveChanges}
								disabled={!hasChanges() || loading}
								className={loading ? "opacity-80" : ""}
							>
								{loading ? "Saving..." : "Save Changes"}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

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
		</div>
	);
}

export default RightSidebar;

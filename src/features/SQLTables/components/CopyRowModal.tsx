import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Editor from "@monaco-editor/react";
import { useAppDispatch } from "../../../store/hooks";
import { fetchTableData } from "../../../store/slices/tablesSlice";

interface CopyRowModalProps {
	open: boolean;
	onClose: () => void;
	connectionId: string;
	tableName: string;
	rowData: Record<string, unknown> | null;
	structure: Array<{ column: string; type: string }>;
	primaryKeys: string[];
}

const CopyRowModal = ({
	open,
	onClose,
	connectionId,
	tableName,
	rowData,
	structure,
	primaryKeys,
}: CopyRowModalProps) => {
	const dispatch = useAppDispatch();
	const [formData, setFormData] = useState<Record<string, unknown>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Initialize form data when modal opens with row data
	useEffect(() => {
		if (open && rowData) {
			// Create a copy of the row data, but exclude the primary keys
			const initialData: Record<string, unknown> = {};

			for (const column of Object.keys(rowData)) {
				// Don't copy primary key values
				if (!primaryKeys.includes(column)) {
					initialData[column] = rowData[column];
				} else {
					// Set primary keys to null or appropriate default value
					initialData[column] = null;
				}
			}

			setFormData(initialData);
		}
	}, [open, rowData, primaryKeys]);

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
				dateObj = new Date(value);
				if (Number.isNaN(dateObj.getTime())) {
					isValidDate = false;
					return typeof value === "string" ? value : String(value);
				}
			} else if (typeof value === "number") {
				dateObj = new Date(value);
				if (Number.isNaN(dateObj.getTime())) {
					isValidDate = false;
					return String(value);
				}
			} else {
				return String(value);
			}

			if (!isValidDate) {
				return typeof value === "string" ? value : String(value);
			}

			if (inputType === "date") {
				return dateObj.toISOString().split("T")[0];
			} else if (inputType === "datetime-local") {
				return dateObj.toISOString().slice(0, 16);
			}

			return typeof value === "string" ? value : String(value);
		} catch (error) {
			console.error("Error formatting date:", error);
			return typeof value === "string" ? value : String(value);
		}
	};

	// Check if a column is a primary key
	const isPrimaryKey = (column: string): boolean => {
		return primaryKeys.includes(column);
	};

	// Handle input change
	const handleInputChange = (column: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			[column]: value,
		}));
	};

	// Handle Monaco editor change for JSON values
	const handleMonacoChange = (column: string, value: string | undefined) => {
		if (value !== undefined) {
			try {
				// Try to parse as JSON if it's a valid JSON string
				const jsonValue = JSON.parse(value);
				setFormData((prev) => ({
					...prev,
					[column]: jsonValue,
				}));
			} catch (error) {
				// If not valid JSON, store as string
				setFormData((prev) => ({
					...prev,
					[column]: value,
				}));
			}
		}
	};

	// Parse value according to its original type
	const parseValue = (column: string, value: string | null): unknown => {
		if (value === null) return null;

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
			if (value === "") return null;
			return value;
		}

		// Handle boolean types
		if (columnType.includes("bool") || columnType.includes("tinyint(1)")) {
			if (value.toLowerCase() === "true") return true;
			if (value.toLowerCase() === "false") return false;
			if (value === "1") return true;
			if (value === "0") return false;
			return value;
		}

		// Handle JSON types
		if (columnType.includes("json")) {
			try {
				return value === "" ? null : JSON.parse(value);
			} catch (error) {
				return value;
			}
		}

		// Default case: return as string
		return value;
	};

	// Handle form submission
	const handleSubmit = async () => {
		try {
			setLoading(true);
			setError(null);

			// Process form data to ensure correct data types
			const processedData: Record<string, unknown> = {};

			for (const column of Object.keys(formData)) {
				const value = formData[column];
				if (typeof value === "string") {
					processedData[column] = parseValue(column, value);
				} else {
					processedData[column] = value;
				}
			}

			// Call the addRow function
			const result = await window.database.addRow(
				connectionId,
				tableName,
				processedData,
			);

			if (result) {
				// Success! Refresh the table data
				dispatch(
					fetchTableData({
						tableName,
						connectionId,
						filters: {},
						sortConfig: { column: "", direction: null },
						pagination: { page: 0, rowsPerPage: 100 },
					}),
				);

				onClose();
			} else {
				setError("Failed to add row. Please try again.");
			}
		} catch (error) {
			console.error("Error adding row:", error);
			setError(
				error instanceof Error ? error.message : "An unknown error occurred",
			);
		} finally {
			setLoading(false);
		}
	};

	// Truncate column name for display if too long
	const truncateColumnName = (name: string, maxLength = 20): string => {
		return name.length > maxLength
			? `${name.substring(0, maxLength)}...`
			: name;
	};

	return (
		<Dialog open={open} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Copy Row - {tableName}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{error && (
						<div className="bg-red-50 text-red-600 p-3 rounded-md border border-red-200">
							{error}
						</div>
					)}

					<div className="space-y-4">
						{Object.keys(formData).map((column) => {
							const value = formData[column];
							const inputType = getInputType(column);
							const columnType = getColumnType(column);
							const isPrimaryKeyColumn = isPrimaryKey(column);

							return (
								<div key={column} className="space-y-1">
									<div className="flex items-center">
										<Label
											htmlFor={`field-${column}`}
											className="text-sm font-medium text-gray-700"
											title={column} // Show full column name on hover
										>
											{truncateColumnName(column)}
											{isPrimaryKeyColumn && (
												<span className="ml-1 text-xs bg-blue-200 text-blue-800 px-1 py-0.5 rounded">
													PK
												</span>
											)}
											<span className="ml-1 text-xs bg-gray-200 text-gray-700 px-1 py-0.5 rounded">
												({columnType || "N/A"})
											</span>
										</Label>
									</div>

									{inputType === "json" ? (
										<div className="border rounded-md overflow-hidden">
											<Editor
												height="120px"
												language="json"
												value={formatValue(value)}
												onChange={(newValue) =>
													handleMonacoChange(column, newValue)
												}
												options={{
													minimap: { enabled: false },
													scrollBeyondLastLine: false,
													lineNumbers: "off",
													lineDecorationsWidth: 0,
													folding: false,
												}}
											/>
										</div>
									) : inputType === "text" &&
										formatValue(value).length > 100 ? (
										<Textarea
											id={`field-${column}`}
											value={formatValue(value)}
											onChange={(e) =>
												handleInputChange(column, e.target.value)
											}
											className="w-full h-24"
										/>
									) : (
										<Input
											id={`field-${column}`}
											type={inputType}
											value={
												inputType.includes("date")
													? formatDateForInput(value, inputType)
													: formatValue(value)
											}
											onChange={(e) =>
												handleInputChange(column, e.target.value)
											}
											className="w-full"
											disabled={isPrimaryKeyColumn} // Disable primary key fields
										/>
									)}
								</div>
							);
						})}
					</div>
				</div>

				<DialogFooter>
					<Button onClick={onClose} variant="outline">
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={loading}>
						{loading ? "Adding..." : "Add Row"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default CopyRowModal;

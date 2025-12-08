import { memo, useState, useEffect, useRef } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TableDataRow, PendingRowChanges } from "../types";
import JsonCell from "./JsonCell";
import EditCellModal from "./EditCellModal";
import { useAppDispatch } from "../../../store/hooks";
import { setPendingChange } from "../../../store/slices/tablesSlice";

interface TableRowProps {
	row: TableDataRow;
	rowIndex: number;
	columns: string[];
	primaryKeys: string[];
	isSelected: boolean;
	columnWidths: Record<string, number>;
	onRowSelect: (row: TableDataRow) => void;
	onCopyCellContent: (value: unknown) => void;
	pendingChanges?: PendingRowChanges | null;
	rowKey?: string;
	tableName?: string;
}

// Format Date to YYYY-MM-DD HH:mm:ss (database-like format)
const formatDateToDbFormat = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Format cell value for display - show raw values from database without any transformation
const formatCellValue = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "";
	}

	// Handle Date objects - format as YYYY-MM-DD HH:mm:ss
	if (value instanceof Date) {
		return formatDateToDbFormat(value);
	}

	if (typeof value === "object") {
		return JSON.stringify(value);
	}

	// Return raw string value without date formatting
	return String(value);
};

// Get default column width based on column name length
const getDefaultColumnWidth = (column: string): number => {
	if (column.length > 30) return 300;
	if (column.length > 20) return 250;
	if (column.length > 10) return 200;
	return 150;
};

// Get column width from state or default
const getColumnWidth = (
	column: string,
	columnWidths: Record<string, number>,
): number => {
	return columnWidths[column] || getDefaultColumnWidth(column);
};

// Get cell width as string
const getCellWidth = (
	column: string,
	columnWidths: Record<string, number>,
): string => {
	return `${getColumnWidth(column, columnWidths)}px`;
};

// Check if a value is JSON (object or array, or a string that parses to one)
// Excludes Date objects which should be displayed as strings
const isJsonValue = (value: unknown): boolean => {
	// Exclude Date objects
	if (value instanceof Date) {
		return false;
	}
	if (typeof value === "object" && value !== null) {
		return true;
	}
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return typeof parsed === "object" && parsed !== null;
		} catch {
			return false;
		}
	}
	return false;
};

const TableRow = memo(function TableRow({
	row,
	rowIndex,
	columns,
	primaryKeys,
	isSelected,
	columnWidths,
	onRowSelect,
	onCopyCellContent,
	pendingChanges,
	rowKey,
	tableName,
}: TableRowProps) {
	const dispatch = useAppDispatch();
	const [editingColumn, setEditingColumn] = useState<string | null>(null);
	const [editValue, setEditValue] = useState<string>("");
	const inputRef = useRef<HTMLInputElement>(null);
	
	// State for Edit Cell Modal (for JSON editing)
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editModalColumn, setEditModalColumn] = useState<string | null>(null);
	const [editModalValue, setEditModalValue] = useState<unknown>(null);
	const [editModalOriginalValue, setEditModalOriginalValue] = useState<unknown>(null);

	// Focus input when editing starts
	useEffect(() => {
		if (editingColumn && inputRef.current) {
			inputRef.current.focus();
		}
	}, [editingColumn]);

	const handleDoubleClick = (column: string, value: unknown, originalValue: unknown) => {
		// Prevent editing if we don't have required props
		if (!tableName || !rowKey) return;
		
		// Check if this is a JSON value - use modal for JSON editing
		if (isJsonValue(value) || isJsonValue(originalValue)) {
			setEditModalColumn(column);
			setEditModalValue(value);
			setEditModalOriginalValue(originalValue);
			setEditModalOpen(true);
			return;
		}

		// For non-JSON values, use inline editing
		setEditingColumn(column);
		
		setEditValue(
			value === null || value === undefined 
				? "" 
				: String(value)
		);
	};

	const handleSave = () => {
		if (!editingColumn || !tableName || !rowKey) return;

		// Simple type inference for inline editing
		let parsedValue: unknown = editValue;
		
		// Handle NULL keyword
		if (editValue.toUpperCase() === "NULL") {
			parsedValue = null;
		}

		// Construct primary key values map
		const primaryKeyValues: Record<string, unknown> = {};
		primaryKeys.forEach(pk => {
			primaryKeyValues[pk] = row[pk];
		});

		dispatch(setPendingChange({
			tableName,
			rowKey,
			primaryKeyValues,
			column: editingColumn,
			value: parsedValue,
			originalValue: row[editingColumn]
		}));

		setEditingColumn(null);
	};

	// Handle save from EditCellModal
	const handleModalSave = (value: unknown) => {
		if (!editModalColumn || !tableName || !rowKey) return;

		// Construct primary key values map
		const primaryKeyValues: Record<string, unknown> = {};
		primaryKeys.forEach(pk => {
			primaryKeyValues[pk] = row[pk];
		});

		dispatch(setPendingChange({
			tableName,
			rowKey,
			primaryKeyValues,
			column: editModalColumn,
			value: value,
			originalValue: row[editModalColumn]
		}));

		setEditModalOpen(false);
		setEditModalColumn(null);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSave();
		} else if (e.key === "Escape") {
			setEditingColumn(null);
		}
	};

	return (
		<>
			<div
				className={`flex w-fit border-b border-border/60 transition-colors ${
					isSelected
						? "bg-primary/10 ring-1 ring-primary/30"
						: rowIndex % 2 === 0
							? "bg-card"
							: "bg-muted/60"
				}`}
				onClick={() => onRowSelect(row)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onRowSelect(row);
					}
				}}
				aria-selected={isSelected}
				style={{ cursor: "pointer" }}
			>
				{columns.map((column) => {
					const originalValue = row[column];
					const pendingChange = pendingChanges?.changes[column];
					const hasPendingChange = !!pendingChange;
					const displayValue = hasPendingChange ? pendingChange.value : originalValue;
					
					const isJson = isJsonValue(displayValue);

					const isPrimaryKey = primaryKeys.includes(column);
					const width = getCellWidth(column, columnWidths);

					// Special styling based on value type
					const isNull = displayValue === null || displayValue === undefined;
					const isEditing = editingColumn === column;

					return (
						<div
							key={`cell-${rowIndex}-${column}`}
							className={`overflow-hidden relative transition-colors duration-150 ${
								hasPendingChange ? "bg-blue-50/50 dark:bg-blue-900/20" : ""
							}`}
							style={{
								width,
								minWidth: width,
								maxWidth: width,
								borderRight: "1px solid var(--border)",
							}}
							onDoubleClick={(e) => {
								e.stopPropagation();
								handleDoubleClick(column, displayValue, originalValue);
							}}
						>
							{isEditing ? (
								<div className="p-1 h-full flex items-center">
									<Input
										ref={inputRef}
										value={editValue}
										onChange={(e) => setEditValue(e.target.value)}
										onKeyDown={handleKeyDown}
										onBlur={handleSave}
										className="h-8 w-full px-2 py-1 text-sm rounded-none border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
										onClick={(e) => e.stopPropagation()}
									/>
								</div>
							) : (
								<div
									className={`px-3 py-2.5 ${isPrimaryKey ? "font-medium" : ""}`}
								>
									{isJson ? (
										<JsonCell value={displayValue} />
									) : (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														className={`p-0 h-auto w-full justify-start font-normal truncate text-left hover:bg-transparent ${
															isNull
																? "text-muted-foreground italic"
																: isPrimaryKey
																	? "font-medium"
																	: ""
														} ${hasPendingChange ? "text-blue-700 dark:text-blue-300 font-medium" : ""}`}
														onClick={(e) => {
															e.stopPropagation();
															onCopyCellContent(displayValue);
														}}
														aria-label={`Copy value: ${formatCellValue(displayValue)}`}
													>
														{isNull ? (
															<span className="text-gray-400">NULL</span>
														) : (
															formatCellValue(displayValue)
														)}
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													<p>Click to copy, Double-click to edit</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									)}
								</div>
							)}
							{hasPendingChange && !isEditing && (
								<div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-bl-sm" />
							)}
						</div>
					);
				})}
			</div>

			{/* Edit Cell Modal for JSON editing */}
			{editModalColumn && tableName && (
				<EditCellModal
					open={editModalOpen}
					onClose={() => {
						setEditModalOpen(false);
						setEditModalColumn(null);
					}}
					tableName={tableName}
					columnName={editModalColumn}
					value={editModalValue}
					originalValue={editModalOriginalValue}
					onSave={handleModalSave}
				/>
			)}
		</>
	);
});

export default TableRow;

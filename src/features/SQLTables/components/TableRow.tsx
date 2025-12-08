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
import dayjs from "dayjs";
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

// Format cell value for display
const formatCellValue = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "";
	}

	if (value instanceof Date) {
		return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}

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

	// Focus input when editing starts
	useEffect(() => {
		if (editingColumn && inputRef.current) {
			inputRef.current.focus();
		}
	}, [editingColumn]);

	const handleDoubleClick = (column: string, value: unknown) => {
		// Prevent editing if we don't have required props
		if (!tableName || !rowKey) return;
		
		// For now, allow editing all columns, even PKs (though risky)
		// Or maybe disable PK editing?
		// if (primaryKeys.includes(column)) return;

		setEditingColumn(column);
		
		// Use pending value if exists, otherwise current value
		const currentValue = pendingChanges?.changes[column] 
			? pendingChanges.changes[column].value 
			: value;
			
		setEditValue(
			currentValue === null || currentValue === undefined 
				? "" 
				: typeof currentValue === 'object' 
					? JSON.stringify(currentValue) 
					: String(currentValue)
		);
	};

	const handleSave = () => {
		if (!editingColumn || !tableName || !rowKey) return;

		// Parse value (simplified - ideally use the same parsing logic as RightSidebar)
		// For now, treat everything as string or number if it looks like one?
		// Better to keep as string and let backend/sidebar logic handle type coercion if possible.
		// But here we are just storing pending change.
		
		// Simple type inference
		let parsedValue: unknown = editValue;
		if (editValue === "NULL" || editValue === "") {
			parsedValue = null; // Or empty string? Let's say empty string -> null for now? No, empty string is valid.
			// Maybe check column type? We don't have structure here easily.
			// Let's just keep as string.
			parsedValue = editValue;
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

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSave();
		} else if (e.key === "Escape") {
			setEditingColumn(null);
		}
	};

	return (
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
				
				const isJson =
					typeof displayValue === "object" &&
					displayValue !== null &&
					!(displayValue instanceof Date);

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
							handleDoubleClick(column, displayValue);
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
	);
});

export default TableRow;


import { memo } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { TableDataRow } from "../types";
import JsonCell from "./JsonCell";
import dayjs from "dayjs";

interface TableRowProps {
	row: TableDataRow;
	rowIndex: number;
	columns: string[];
	primaryKeys: string[];
	isSelected: boolean;
	columnWidths: Record<string, number>;
	onRowSelect: (row: TableDataRow) => void;
	onCopyCellContent: (value: unknown) => void;
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
}: TableRowProps) {
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
				const cellValue = row[column];
				const isJson =
					typeof cellValue === "object" &&
					cellValue !== null &&
					!(cellValue instanceof Date);

				const isPrimaryKey = primaryKeys.includes(column);
				const width = getCellWidth(column, columnWidths);

				// Special styling based on value type
				const isNull = cellValue === null || cellValue === undefined;

				return (
					<div
						key={`cell-${rowIndex}-${column}`}
						className="overflow-hidden relative transition-colors duration-150"
						style={{
							width,
							minWidth: width,
							maxWidth: width,
							borderRight: "1px solid var(--border)",
						}}
					>
						<div
							className={`px-3 py-2.5 ${isPrimaryKey ? "font-medium" : ""}`}
						>
							{isJson ? (
								<JsonCell value={cellValue} />
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
												}`}
												onClick={() => onCopyCellContent(cellValue)}
												aria-label={`Copy value: ${formatCellValue(cellValue)}`}
											>
												{isNull ? (
													<span className="text-gray-400">NULL</span>
												) : (
													formatCellValue(cellValue)
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Click to copy</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
});

export default TableRow;


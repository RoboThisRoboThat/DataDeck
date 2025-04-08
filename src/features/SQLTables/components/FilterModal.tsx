import { useState, useEffect } from "react";
import { FiFilter } from "react-icons/fi";
import Select from "react-select";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Select as RadixSelect,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	type FilterOperator,
	FILTER_OPERATORS,
	FILTER_OPERATOR_LABELS,
} from "../types";

interface FilterModalProps {
	open: boolean;
	onClose: () => void;
	columns: string[]; // Array of all available columns
	selectedColumn?: string; // Optional initially selected column
	currentFilter: { operator: string; value: string } | undefined;
	onApply: (column: string, operator: string, value: string) => void;
}

const FilterModal = ({
	open,
	onClose,
	columns,
	selectedColumn,
	currentFilter,
	onApply,
}: FilterModalProps) => {
	const [column, setColumn] = useState<string>("");
	const [operator, setOperator] = useState<FilterOperator>("=");
	const [value, setValue] = useState("");
	const [error, setError] = useState("");
	const [initialized, setInitialized] = useState(false);

	// Initialize values when the modal opens
	useEffect(() => {
		if (open && !initialized) {
			// Initialize column
			if (selectedColumn) {
				setColumn(selectedColumn);
			} else if (columns.length > 0) {
				setColumn(columns[0]);
			}

			// Initialize filter values
			if (currentFilter) {
				setOperator(currentFilter.operator as FilterOperator);
				setValue(currentFilter.value);
			} else {
				setOperator("=");
				setValue("");
			}

			setError("");
			setInitialized(true);
		}

		// Reset initialization state when modal closes
		if (!open) {
			setInitialized(false);
		}
	}, [open, currentFilter, selectedColumn, columns, initialized]);

	const handleOperatorChange = (newOperator: string) => {
		setOperator(newOperator as FilterOperator);

		// Clear value if the operator doesn't require a value
		if (!requiresValue(newOperator as FilterOperator)) {
			setValue("");
		}
	};

	// Handle apply filter
	const handleApply = () => {
		// Validate column selection
		if (!column) {
			setError("Please select a column to filter");
			return;
		}

		// Validate based on operator
		if (!requiresValue(operator)) {
			// These operators don't need a value
			onApply(column, operator, "");
			onClose();
			return;
		}

		if (!value.trim()) {
			setError("Please enter a filter value");
			return;
		}

		onApply(column, operator, value.trim());
		onClose();
	};

	// Handle clear filter
	const handleClear = () => {
		onApply(column, "", "");
		onClose();
	};

	// Determine if the selected operator requires a value input
	const requiresValue = (op: FilterOperator) =>
		!["IS NULL", "IS NOT NULL"].includes(op);

	// Get placeholder text based on operator
	const getPlaceholder = () => {
		switch (operator) {
			case "IN":
			case "NOT IN":
				return "Comma-separated values (e.g. value1, value2)";
			case "LIKE":
			case "NOT LIKE":
				return "Use % as wildcard (e.g. %text% for contains)";
			default:
				return "Enter value";
		}
	};

	// Get helper text based on operator
	const getHelperText = () => {
		if (error) return error;

		switch (operator) {
			case "LIKE":
			case "NOT LIKE":
				return "% matches any sequence of characters";
			case "IN":
			case "NOT IN":
				return "Separate multiple values with commas";
			default:
				return "";
		}
	};

	// Convert columns to options for react-select
	const columnOptions = columns.map((col) => ({ value: col, label: col }));

	return (
		<Dialog open={open} onOpenChange={() => onClose()}>
			<DialogContent className="sm:max-w-md rounded-lg overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
				<DialogHeader className="bg-blue-50 dark:bg-blue-900/30 -mx-6 -mt-4 px-6 py-4 border-b border-blue-100 dark:border-blue-900/50">
					<DialogTitle className="flex items-center justify-between text-blue-800 dark:text-blue-300">
						<div className="flex items-center gap-2">
							<FiFilter
								className="text-blue-600 dark:text-blue-400"
								size={18}
							/>
							<span className="font-medium">Filter Data</span>
						</div>
					</DialogTitle>
				</DialogHeader>

				<div className="pt-5 pb-3 px-1 space-y-6">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Select a column and filter condition. Some operators require an
						additional value.
					</p>

					<div className="space-y-4">
						<div>
							<Label
								htmlFor="filter-column"
								className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300"
							>
								Column<span className="text-red-500 dark:text-red-400">*</span>
							</Label>
							<Select
								inputId="filter-column"
								value={columnOptions.find((option) => option.value === column)}
								onChange={(option) => setColumn(option ? option.value : "")}
								options={columnOptions}
								placeholder="Select column"
								className="text-sm"
								styles={{
									control: (baseStyles, state) => ({
										...baseStyles,
										borderColor:
											!column && error
												? "#f87171"
												: state.isFocused
													? "#3b82f6"
													: "#374151",
										boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
										"&:hover": {
											borderColor: state.isFocused ? "#3b82f6" : "#60a5fa",
										},
										backgroundColor: "rgb(17 24 39)",
										borderRadius: "0.375rem",
										minHeight: "38px",
										color: "white",
									}),
									menu: (baseStyles) => ({
										...baseStyles,
										zIndex: 50,
										backgroundColor: "rgb(17 24 39)",
									}),
									option: (baseStyles, state) => ({
										...baseStyles,
										backgroundColor: state.isFocused
											? "rgb(55 65 81)"
											: "rgb(17 24 39)",
										color: "white",
										":active": {
											backgroundColor: "rgb(55 65 81)",
										},
									}),
									singleValue: (baseStyles) => ({
										...baseStyles,
										color: "white",
									}),
									input: (baseStyles) => ({
										...baseStyles,
										color: "white",
									}),
								}}
								theme={(theme) => ({
									...theme,
									colors: {
										...theme.colors,
										neutral0: "rgb(17 24 39)",
										neutral20: "#374151",
										neutral30: "#4B5563",
										neutral40: "#6B7280",
										neutral50: "#9CA3AF",
										neutral60: "#D1D5DB",
										neutral70: "#E5E7EB",
										neutral80: "#F3F4F6",
										neutral90: "#F9FAFB",
									},
								})}
							/>
							{!column && error && (
								<p className="text-xs mt-1.5 text-red-500 dark:text-red-400">
									{error}
								</p>
							)}
						</div>

						<div>
							<Label
								htmlFor="filter-operator"
								className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300"
							>
								Operator
							</Label>
							<RadixSelect
								value={operator}
								onValueChange={handleOperatorChange}
							>
								<SelectTrigger
									id="filter-operator"
									className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors text-gray-900 dark:text-gray-100"
								>
									<SelectValue placeholder="Select operator" />
								</SelectTrigger>
								<SelectContent className="max-h-60 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
									{FILTER_OPERATORS.map((op) => (
										<SelectItem
											key={op}
											value={op}
											className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
										>
											{FILTER_OPERATOR_LABELS[op]}
										</SelectItem>
									))}
								</SelectContent>
							</RadixSelect>
						</div>

						{requiresValue(operator) ? (
							<div>
								<Label
									htmlFor="filter-value"
									className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300"
								>
									Value
								</Label>
								<Input
									id="filter-value"
									value={value}
									onChange={(e) => setValue(e.target.value)}
									placeholder={getPlaceholder()}
									className={`bg-white dark:bg-gray-800 border ${
										error
											? "border-red-500 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-600"
											: "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
									} transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500`}
									autoFocus
								/>
								{getHelperText() && (
									<p
										className={`text-xs mt-1.5 ${
											error
												? "text-red-500 dark:text-red-400"
												: "text-gray-500 dark:text-gray-400"
										}`}
									>
										{getHelperText()}
									</p>
								)}
							</div>
						) : (
							<div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm mt-2">
								This operator doesn't require a value.
							</div>
						)}
					</div>
				</div>

				<DialogFooter className="flex justify-between bg-gray-50 dark:bg-gray-800 -mx-6 -mb-4 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
					<Button
						onClick={handleClear}
						variant="outline"
						className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-800 transition-colors"
					>
						Clear Filter
					</Button>

					<div className="flex gap-3">
						<Button
							onClick={onClose}
							variant="outline"
							className="text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
						>
							Cancel
						</Button>
						<Button
							onClick={handleApply}
							disabled={requiresValue(operator) && !value.trim()}
							className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white transition-colors font-medium px-4 disabled:bg-blue-400 dark:disabled:bg-blue-800"
						>
							Apply
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default FilterModal;

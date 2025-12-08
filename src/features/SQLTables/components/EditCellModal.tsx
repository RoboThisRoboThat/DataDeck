import { useState, useEffect, useCallback } from "react";
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
import { FiCheck, FiX, FiAlertCircle } from "react-icons/fi";

interface EditCellModalProps {
	open: boolean;
	onClose: () => void;
	tableName: string;
	columnName: string;
	value: unknown;
	originalValue: unknown;
	onSave: (value: unknown) => void;
}

const EditCellModal = ({
	open,
	onClose,
	tableName,
	columnName,
	value,
	originalValue,
	onSave,
}: EditCellModalProps) => {
	const [newValue, setNewValue] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [isJson, setIsJson] = useState(false);

	// Detect if value is JSON
	const detectIsJson = useCallback((val: unknown): boolean => {
		if (typeof val === "object" && val !== null) {
			return true;
		}
		if (typeof val === "string") {
			try {
				const parsed = JSON.parse(val);
				return typeof parsed === "object" && parsed !== null;
			} catch {
				return false;
			}
		}
		return false;
	}, []);

	// Initialize the form with the current value
	useEffect(() => {
		if (!open) return;
		
		const jsonDetected = detectIsJson(value);
		setIsJson(jsonDetected);
		setError(null);

		if (value === null || value === undefined) {
			setNewValue("");
		} else if (typeof value === "object") {
			setNewValue(JSON.stringify(value, null, 2));
		} else if (jsonDetected && typeof value === "string") {
			// Pretty print JSON strings
			try {
				const parsed = JSON.parse(value);
				setNewValue(JSON.stringify(parsed, null, 2));
			} catch {
				setNewValue(String(value));
			}
		} else {
			setNewValue(String(value));
		}
	}, [value, open, detectIsJson]);

	// Validate JSON as user types
	const handleJsonChange = (val: string) => {
		setNewValue(val);
		if (isJson && val.trim()) {
			try {
				JSON.parse(val);
				setError(null);
			} catch (e) {
				setError("Invalid JSON syntax");
			}
		} else {
			setError(null);
		}
	};

	// Format JSON (pretty print)
	const handleFormatJson = () => {
		if (!isJson) return;
		try {
			const parsed = JSON.parse(newValue);
			setNewValue(JSON.stringify(parsed, null, 2));
			setError(null);
		} catch (e) {
			setError("Cannot format: Invalid JSON syntax");
		}
	};

	// Minify JSON
	const handleMinifyJson = () => {
		if (!isJson) return;
		try {
			const parsed = JSON.parse(newValue);
			setNewValue(JSON.stringify(parsed));
			setError(null);
		} catch (e) {
			setError("Cannot minify: Invalid JSON syntax");
		}
	};

	const handleSave = () => {
		setError(null);

		try {
			let parsedValue: unknown = newValue;

			// Handle empty string as null
			if (newValue === "" || newValue.toUpperCase() === "NULL") {
				parsedValue = null;
			} else if (isJson) {
				// Parse JSON
				try {
					parsedValue = JSON.parse(newValue);
				} catch (e) {
					setError("Invalid JSON format. Please fix the syntax errors.");
					return;
				}
			} else if (typeof originalValue === "number") {
				// Try to parse as number if original was a number
				const parsedNumber = Number.parseFloat(newValue);
				if (Number.isNaN(parsedNumber)) {
					setError("Invalid number format");
					return;
				}
				parsedValue = parsedNumber;
			} else if (typeof originalValue === "boolean") {
				// Parse boolean
				if (newValue.toLowerCase() === "true") parsedValue = true;
				else if (newValue.toLowerCase() === "false") parsedValue = false;
				else {
					setError('Invalid boolean value. Use "true" or "false"');
					return;
				}
			}

			onSave(parsedValue);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onClose();
		}
		// For non-JSON, allow Enter to save
		if (e.key === "Enter" && !isJson && !e.shiftKey) {
			e.preventDefault();
			handleSave();
		}
		// For JSON, Ctrl/Cmd + Enter to save
		if (e.key === "Enter" && isJson && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSave();
		}
	};

	const formatDisplayValue = (val: unknown): React.ReactNode => {
		if (val === null || val === undefined) {
			return <span className="text-muted-foreground italic">NULL</span>;
		}
		if (typeof val === "object") {
			return (
				<pre className="bg-muted/50 p-2 rounded overflow-auto max-h-24 text-xs font-mono">
					{JSON.stringify(val, null, 2)}
				</pre>
			);
		}
		return <span className="font-mono text-sm">{String(val)}</span>;
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col bg-[#1e1e1e] border-[#3c3c3c] p-0">
				{/* Header */}
				<DialogHeader className="bg-[#252526] px-4 py-3 border-b border-[#3c3c3c]">
					<DialogTitle className="flex items-center gap-3 text-[#cccccc]">
						<span className="font-normal text-sm">Edit Cell</span>
						<span className="text-xs bg-[#0e639c] text-white px-2 py-0.5 rounded">
							{tableName}.{columnName}
						</span>
						{isJson && (
							<span className="text-xs bg-[#4ec9b0]/20 text-[#4ec9b0] px-2 py-0.5 rounded">
								JSON
							</span>
						)}
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{/* Current Value */}
					<div>
						<label className="text-xs text-[#858585] mb-1.5 block">
							Current Value
						</label>
						<div className="bg-[#252526] border border-[#3c3c3c] rounded p-3 text-[#cccccc]">
							{formatDisplayValue(originalValue)}
						</div>
					</div>

					{/* New Value */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<label className="text-xs text-[#858585]">New Value</label>
							{isJson && (
								<div className="flex gap-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={handleFormatJson}
										className="h-6 px-2 text-xs text-[#858585] hover:text-[#cccccc] hover:bg-[#3c3c3c]"
									>
										Format
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleMinifyJson}
										className="h-6 px-2 text-xs text-[#858585] hover:text-[#cccccc] hover:bg-[#3c3c3c]"
									>
										Minify
									</Button>
								</div>
							)}
						</div>
						{isJson ? (
							<Textarea
								value={newValue}
								onChange={(e) => handleJsonChange(e.target.value)}
								onKeyDown={handleKeyDown}
								rows={12}
								className={`font-mono text-sm bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc] focus:border-[#0e639c] focus:ring-[#0e639c] resize-none ${
									error ? "border-[#f14c4c]" : ""
								}`}
								placeholder="Enter JSON value..."
								spellCheck={false}
							/>
						) : (
							<Input
								value={newValue}
								onChange={(e) => setNewValue(e.target.value)}
								onKeyDown={handleKeyDown}
								className={`bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc] focus:border-[#0e639c] focus:ring-[#0e639c] ${
									error ? "border-[#f14c4c]" : ""
								}`}
								placeholder="Enter value (leave empty for NULL)"
								autoFocus
							/>
						)}
						{error && (
							<div className="flex items-center gap-1.5 mt-2 text-[#f14c4c] text-xs">
								<FiAlertCircle size={12} />
								<span>{error}</span>
							</div>
						)}
						{!error && isJson && (
							<p className="text-xs text-[#858585] mt-2">
								Press <kbd className="bg-[#3c3c3c] px-1 rounded">Ctrl</kbd>+<kbd className="bg-[#3c3c3c] px-1 rounded">Enter</kbd> to save
							</p>
						)}
						{!error && !isJson && (
							<p className="text-xs text-[#858585] mt-2">
								Press <kbd className="bg-[#3c3c3c] px-1 rounded">Enter</kbd> to save, type <code className="bg-[#3c3c3c] px-1 rounded">NULL</code> for empty
							</p>
						)}
					</div>
				</div>

				{/* Footer */}
				<DialogFooter className="bg-[#252526] px-4 py-3 border-t border-[#3c3c3c] flex justify-end items-center gap-2">
					<Button
						variant="ghost"
						onClick={onClose}
						className="text-[#cccccc] hover:bg-[#3c3c3c] border border-[#3c3c3c]"
					>
						<FiX className="mr-1.5" size={14} />
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={!!error}
						className="bg-[#0e639c] hover:bg-[#1177bb] text-white border-0 disabled:opacity-50"
					>
						<FiCheck className="mr-1.5" size={14} />
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default EditCellModal;

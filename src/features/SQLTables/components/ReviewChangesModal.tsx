import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiSave, FiX, FiMinus, FiPlus } from "react-icons/fi";
import type { PendingRowChanges } from "../types";
import { useMemo } from "react";

interface ReviewChangesModalProps {
	open: boolean;
	onClose: () => void;
	changes: Record<string, PendingRowChanges>;
	onSave: () => void;
	onDiscard: (rowKey: string, column?: string) => void;
	loading: boolean;
}

interface JsonDiffItem {
	path: string;
	type: 'added' | 'removed' | 'changed';
	oldValue?: unknown;
	newValue?: unknown;
}

// Compute diff between two JSON values
function computeJsonDiff(oldVal: unknown, newVal: unknown, path = ''): JsonDiffItem[] {
	const diffs: JsonDiffItem[] = [];

	// Handle null/undefined cases
	if (oldVal === newVal) return diffs;
	if (oldVal === null || oldVal === undefined) {
		diffs.push({ path: path || 'root', type: 'added', newValue: newVal });
		return diffs;
	}
	if (newVal === null || newVal === undefined) {
		diffs.push({ path: path || 'root', type: 'removed', oldValue: oldVal });
		return diffs;
	}

	// Different types
	if (typeof oldVal !== typeof newVal) {
		diffs.push({ path: path || 'root', type: 'changed', oldValue: oldVal, newValue: newVal });
		return diffs;
	}

	// Arrays
	if (Array.isArray(oldVal) && Array.isArray(newVal)) {
		const maxLen = Math.max(oldVal.length, newVal.length);
		for (let i = 0; i < maxLen; i++) {
			const itemPath = path ? `${path}[${i}]` : `[${i}]`;
			if (i >= oldVal.length) {
				diffs.push({ path: itemPath, type: 'added', newValue: newVal[i] });
			} else if (i >= newVal.length) {
				diffs.push({ path: itemPath, type: 'removed', oldValue: oldVal[i] });
			} else {
				diffs.push(...computeJsonDiff(oldVal[i], newVal[i], itemPath));
			}
		}
		return diffs;
	}

	// Objects
	if (typeof oldVal === 'object' && typeof newVal === 'object') {
		const oldObj = oldVal as Record<string, unknown>;
		const newObj = newVal as Record<string, unknown>;
		const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
		
		for (const key of allKeys) {
			const keyPath = path ? `${path}.${key}` : key;
			if (!(key in oldObj)) {
				diffs.push({ path: keyPath, type: 'added', newValue: newObj[key] });
			} else if (!(key in newObj)) {
				diffs.push({ path: keyPath, type: 'removed', oldValue: oldObj[key] });
			} else {
				diffs.push(...computeJsonDiff(oldObj[key], newObj[key], keyPath));
			}
		}
		return diffs;
	}

	// Primitives
	if (oldVal !== newVal) {
		diffs.push({ path: path || 'root', type: 'changed', oldValue: oldVal, newValue: newVal });
	}

	return diffs;
}

// Check if value is a JSON object or array
function isJsonValue(value: unknown): boolean {
	return typeof value === 'object' && value !== null;
}

// Try to parse JSON string
function tryParseJson(value: unknown): { isJson: boolean; parsed: unknown } {
	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value);
			if (typeof parsed === 'object' && parsed !== null) {
				return { isJson: true, parsed };
			}
		} catch {
			// Not JSON
		}
	}
	if (isJsonValue(value)) {
		return { isJson: true, parsed: value };
	}
	return { isJson: false, parsed: value };
}

const ReviewChangesModal = ({
	open,
	onClose,
	changes,
	onSave,
	onDiscard,
	loading,
}: ReviewChangesModalProps) => {
	const changeCount = useMemo(() => {
		return Object.values(changes).reduce(
			(acc, rowChanges) => acc + Object.keys(rowChanges.changes).length,
			0,
		);
	}, [changes]);

	const rowCount = useMemo(() => Object.keys(changes).length, [changes]);

	const formatValue = (value: unknown): string => {
		if (value === null) return "NULL";
		if (value === undefined) return "undefined";
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	};

	const formatCompactValue = (value: unknown): string => {
		if (value === null) return "null";
		if (value === undefined) return "undefined";
		if (typeof value === "string") return `"${value}"`;
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	};

	return (
		<Dialog open={open} onOpenChange={(val) => !val && onClose()}>
			<DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col bg-[#1e1e1e] border-[#3c3c3c] p-0">
				{/* Header - VS Code style */}
				<DialogHeader className="bg-[#252526] px-4 py-3 border-b border-[#3c3c3c]">
					<DialogTitle className="flex items-center justify-between text-[#cccccc]">
						<div className="flex items-center gap-3">
							<FiSave className="text-[#569cd6]" size={16} />
							<span className="font-normal text-sm">
								Review Changes
							</span>
							<span className="text-xs bg-[#0e639c] text-white px-2 py-0.5 rounded-full">
								{changeCount} {changeCount === 1 ? 'change' : 'changes'} in {rowCount} {rowCount === 1 ? 'row' : 'rows'}
							</span>
						</div>
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto">
					<div className="divide-y divide-[#3c3c3c]">
						{Object.entries(changes).map(([rowKey, rowData]) => {
							const { primaryKeyValues, changes: rowChanges } = rowData;
							const pkDisplay = Object.entries(primaryKeyValues)
								.map(([k, v]) => `${k}=${v}`)
								.join(", ");

							return (
								<div key={rowKey} className="group">
									{/* Row header - file path style */}
									<div className="bg-[#252526] px-4 py-2 flex justify-between items-center sticky top-0 z-10">
										<div className="flex items-center gap-2">
											<span className="text-[#e8ab53] text-xs font-mono">
												{pkDisplay}
											</span>
											<span className="text-[#858585] text-xs">
												({Object.keys(rowChanges).length} {Object.keys(rowChanges).length === 1 ? 'field' : 'fields'})
											</span>
										</div>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 px-2 text-[#858585] hover:text-[#f48771] hover:bg-[#5a1d1d]/50 opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={() => onDiscard(rowKey)}
											title="Discard all changes for this row"
										>
											<FiX className="mr-1" size={12} />
											Discard
										</Button>
									</div>

									{/* Changes - diff style */}
									<div className="font-mono text-sm">
										{Object.entries(rowChanges).map(([col, change]) => {
											const oldParsed = tryParseJson(change.originalValue);
											const newParsed = tryParseJson(change.value);
											const bothJson = oldParsed.isJson && newParsed.isJson;
											
											// Compute JSON diff if both values are JSON
											const jsonDiffs = bothJson 
												? computeJsonDiff(oldParsed.parsed, newParsed.parsed)
												: [];

											// Helper to format path for display
											const formatPath = (path: string) => {
												const parts = path.split(/\.|\[/).map(p => p.replace(']', ''));
												return parts;
											};

											// Helper to get change type label
											const getChangeTypeLabel = (type: 'added' | 'removed' | 'changed') => {
												switch (type) {
													case 'added': return 'Added';
													case 'removed': return 'Removed';
													case 'changed': return 'Modified';
												}
											};

											return (
												<div key={col} className="group/change relative">
													{/* Column name */}
													<div className="bg-[#2d2d2d] px-4 py-1.5 text-[#569cd6] text-xs border-b border-[#3c3c3c] flex items-center justify-between">
														<span className="font-medium">{col}</span>
														{bothJson && jsonDiffs.length > 0 && (
															<span className="text-[#858585]">
																{jsonDiffs.length} {jsonDiffs.length === 1 ? 'property' : 'properties'} changed
															</span>
														)}
													</div>
													
													{bothJson && jsonDiffs.length > 0 ? (
														// JSON diff view - show only changed properties with full context
														<div className="divide-y divide-[#3c3c3c]/50">
															{jsonDiffs.map((diff, idx) => {
																const pathParts = formatPath(diff.path);
																const propertyName = pathParts[pathParts.length - 1];
																const parentPath = pathParts.slice(0, -1);
																
																return (
																	<div key={idx} className="text-xs">
																		{/* Path header with full context */}
																		<div className="bg-[#252526] px-4 py-2 border-b border-[#3c3c3c]/50">
																			{/* Change type badge */}
																			<div className="flex items-center gap-2 mb-1.5">
																				<span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
																					diff.type === 'added' 
																						? 'bg-[#1b4721] text-[#23d18b]' 
																						: diff.type === 'removed'
																							? 'bg-[#4b1818] text-[#f14c4c]'
																							: 'bg-[#0e639c] text-white'
																				}`}>
																					{getChangeTypeLabel(diff.type)}
																				</span>
																				<span className="text-[#858585]">in</span>
																				<span className="text-[#ce9178]">{col}</span>
																			</div>
																			
																			{/* Breadcrumb path */}
																			<div className="flex items-center flex-wrap gap-1 text-[11px]">
																				<span className="text-[#858585]">Path:</span>
																				{parentPath.length > 0 && (
																					<>
																						{parentPath.map((part, i) => (
																							<span key={i} className="flex items-center">
																								<span className={`${
																									part.match(/^\d+$/) 
																										? 'text-[#b5cea8]' // number (array index)
																										: 'text-[#9cdcfe]' // property name
																								}`}>
																									{part.match(/^\d+$/) ? `[${part}]` : part}
																								</span>
																								<span className="text-[#858585] mx-1">→</span>
																							</span>
																						))}
																					</>
																				)}
																				<span className={`font-medium ${
																					propertyName.match(/^\d+$/) 
																						? 'text-[#b5cea8]' 
																						: 'text-[#4fc1ff]'
																				}`}>
																					{propertyName.match(/^\d+$/) ? `[${propertyName}]` : propertyName}
																				</span>
																			</div>
																		</div>
																		
																		{/* Values */}
																		{(diff.type === 'removed' || diff.type === 'changed') && (
																			<div className="flex items-stretch bg-[#4b1818] border-l-4 border-[#f14c4c]">
																				<div className="w-10 flex-shrink-0 flex items-center justify-center text-[#f14c4c] bg-[#3d1515] text-[10px] font-medium">
																					OLD
																				</div>
																				<div className="flex-1 px-3 py-1.5 text-[#f14c4c] overflow-hidden break-all">
																					<span className="line-through opacity-80">
																						{formatCompactValue(diff.oldValue)}
																					</span>
																				</div>
																			</div>
																		)}
																		
																		{(diff.type === 'added' || diff.type === 'changed') && (
																			<div className="flex items-stretch bg-[#1b4721] border-l-4 border-[#23d18b]">
																				<div className="w-10 flex-shrink-0 flex items-center justify-center text-[#23d18b] bg-[#143d1a] text-[10px] font-medium">
																					NEW
																				</div>
																				<div className="flex-1 px-3 py-1.5 text-[#23d18b] overflow-hidden break-all">
																					{formatCompactValue(diff.newValue)}
																				</div>
																			</div>
																		)}
																	</div>
																);
															})}
														</div>
													) : (
														// Regular diff view for non-JSON values
														<>
															{/* Deletion line (red) */}
															<div className="flex items-stretch bg-[#4b1818] border-l-4 border-[#f14c4c]">
																<div className="w-8 flex-shrink-0 flex items-center justify-center text-[#f14c4c] bg-[#3d1515]">
																	<FiMinus size={12} />
																</div>
																<div className="flex-1 px-3 py-1.5 text-[#f14c4c] overflow-hidden break-all">
																	<span className="line-through opacity-80">
																		{formatValue(change.originalValue)}
																	</span>
																</div>
															</div>
															
															{/* Addition line (green) */}
															<div className="flex items-stretch bg-[#1b4721] border-l-4 border-[#23d18b]">
																<div className="w-8 flex-shrink-0 flex items-center justify-center text-[#23d18b] bg-[#143d1a]">
																	<FiPlus size={12} />
																</div>
																<div className="flex-1 px-3 py-1.5 text-[#23d18b] overflow-hidden break-all">
																	{formatValue(change.value)}
																</div>
															</div>
														</>
													)}

													{/* Discard single change button */}
													<Button
														variant="ghost"
														size="icon"
														className="absolute right-2 top-6 h-6 w-6 rounded text-[#858585] opacity-0 group-hover/change:opacity-100 hover:bg-[#5a1d1d] hover:text-[#f48771] transition-all"
														onClick={() => onDiscard(rowKey, col)}
														title="Discard this change"
													>
														<FiX size={14} />
													</Button>
												</div>
											);
										})}
									</div>
								</div>
							);
						})}

						{Object.keys(changes).length === 0 && (
							<div className="text-center py-12 text-[#858585]">
								<FiSave className="mx-auto mb-3 opacity-50" size={32} />
								<p>No pending changes</p>
							</div>
						)}
					</div>
				</div>

				{/* Footer - VS Code style */}
				<DialogFooter className="bg-[#252526] px-4 py-3 border-t border-[#3c3c3c] flex justify-between items-center">
					<div className="text-xs text-[#858585]">
						{changeCount > 0 && (
							<>
								<span className="text-[#f14c4c]">−{changeCount}</span>
								{" / "}
								<span className="text-[#23d18b]">+{changeCount}</span>
								{" lines"}
							</>
						)}
					</div>
					<div className="flex gap-2">
						<Button
							variant="ghost"
							onClick={onClose}
							disabled={loading}
							className="text-[#cccccc] hover:bg-[#3c3c3c] border border-[#3c3c3c]"
						>
							Cancel
						</Button>
						<Button
							onClick={onSave}
							disabled={changeCount === 0 || loading}
							className="bg-[#0e639c] hover:bg-[#1177bb] text-white border-0"
						>
							{loading ? "Saving..." : "Commit Changes"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ReviewChangesModal;


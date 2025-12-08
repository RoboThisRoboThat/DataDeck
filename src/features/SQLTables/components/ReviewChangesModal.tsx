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
										{Object.entries(rowChanges).map(([col, change]) => (
											<div key={col} className="group/change relative">
												{/* Column name */}
												<div className="bg-[#2d2d2d] px-4 py-1 text-[#569cd6] text-xs border-b border-[#3c3c3c]">
													{col}
												</div>
												
												{/* Deletion line (red) */}
												<div className="flex items-stretch bg-[#4b1818] border-l-4 border-[#f14c4c]">
													<div className="w-8 flex-shrink-0 flex items-center justify-center text-[#f14c4c] bg-[#3d1515]">
														<FiMinus size={12} />
													</div>
													<div className="flex-1 px-3 py-1.5 text-[#f14c4c] overflow-hidden">
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
													<div className="flex-1 px-3 py-1.5 text-[#23d18b] overflow-hidden">
														{formatValue(change.value)}
													</div>
												</div>

												{/* Discard single change button */}
												<Button
													variant="ghost"
													size="icon"
													className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded text-[#858585] opacity-0 group-hover/change:opacity-100 hover:bg-[#5a1d1d] hover:text-[#f48771] transition-all"
													onClick={() => onDiscard(rowKey, col)}
													title="Discard this change"
												>
													<FiX size={14} />
												</Button>
											</div>
										))}
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


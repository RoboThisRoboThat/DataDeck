import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiAlertCircle, FiX, FiCopy, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useError } from "@/context/ErrorContext";
import { useState } from "react";

export function ErrorModal() {
	const { error, clearError } = useError();
	const [showDetails, setShowDetails] = useState(false);

	const handleCopyError = () => {
		if (error) {
			const errorText = [
				error.title || "Error",
				error.message,
				error.details ? `\nDetails:\n${error.details}` : "",
			].join("\n");
			navigator.clipboard.writeText(errorText);
		}
	};

	if (!error) return null;

	return (
		<Dialog open={!!error} onOpenChange={(open) => !open && clearError()}>
			<DialogContent className="sm:max-w-lg bg-[#1e1e1e] border-[#3c3c3c] p-0 overflow-hidden">
				{/* Header - Error style */}
				<DialogHeader className="bg-[#5a1d1d] px-4 py-3 border-b border-[#be1100]">
					<DialogTitle className="flex items-center gap-3 text-[#f14c4c]">
						<div className="p-1.5 bg-[#be1100]/30 rounded-full">
							<FiAlertCircle size={18} />
						</div>
						<span className="font-medium text-base">
							{error.title || "Error"}
						</span>
					</DialogTitle>
				</DialogHeader>

				<div className="p-4">
					{/* Main error message */}
					<div className="bg-[#2d2d2d] rounded-lg border border-[#3c3c3c] overflow-hidden">
						<div className="px-4 py-3">
							<p className="text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
								{error.message}
							</p>
						</div>

						{/* Details section (collapsible) */}
						{error.details && (
							<>
								<button
									type="button"
									onClick={() => setShowDetails(!showDetails)}
									className="w-full px-4 py-2 bg-[#252526] border-t border-[#3c3c3c] flex items-center justify-between text-xs text-[#858585] hover:text-[#cccccc] transition-colors"
								>
									<span>Technical Details</span>
									{showDetails ? (
										<FiChevronUp size={14} />
									) : (
										<FiChevronDown size={14} />
									)}
								</button>
								{showDetails && (
									<div className="px-4 py-3 bg-[#1a1a1a] border-t border-[#3c3c3c]">
										<pre className="text-xs text-[#858585] font-mono whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
											{error.details}
										</pre>
									</div>
								)}
							</>
						)}
					</div>

					{/* Help text */}
					<p className="mt-3 text-xs text-[#858585]">
						If this error persists, try refreshing the application or check your database connection.
					</p>
				</div>

				{/* Footer */}
				<DialogFooter className="bg-[#252526] px-4 py-3 border-t border-[#3c3c3c] flex justify-between items-center">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCopyError}
						className="text-[#858585] hover:text-[#cccccc] hover:bg-[#3c3c3c]"
					>
						<FiCopy className="mr-2" size={14} />
						Copy Error
					</Button>
					<Button
						onClick={clearError}
						className="bg-[#0e639c] hover:bg-[#1177bb] text-white border-0"
					>
						<FiX className="mr-2" size={14} />
						Dismiss
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default ErrorModal;


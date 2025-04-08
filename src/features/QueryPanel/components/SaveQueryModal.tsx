import { useState, useEffect, type FC } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SaveQueryModalProps {
	open: boolean;
	onClose: () => void;
	onSave: (name: string, description?: string) => void;
	sql: string;
}

const SaveQueryModal: FC<SaveQueryModalProps> = ({
	open,
	onClose,
	onSave,
	sql,
}) => {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [nameError, setNameError] = useState("");

	// Reset form when modal opens
	useEffect(() => {
		if (open) {
			setName("");
			setDescription("");
			setNameError("");
		}
	}, [open]);

	// Handle name change
	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setName(e.target.value);
		// Clear error when user types
		if (e.target.value.trim()) {
			setNameError("");
		}
	};

	// Handle description change
	const handleDescriptionChange = (
		e: React.ChangeEvent<HTMLTextAreaElement>,
	) => {
		setDescription(e.target.value);
	};

	// Handle save
	const handleSave = () => {
		if (!name.trim()) {
			setNameError("Please enter a name for your query");
			return;
		}
		onSave(name, description);
	};

	return (
		<Dialog open={open} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
				<DialogHeader>
					<DialogTitle className="text-blue-800 dark:text-blue-300">
						Save SQL Query
					</DialogTitle>
					<DialogDescription className="text-gray-600 dark:text-gray-400">
						Save your query to easily access it later. Provide a descriptive
						name to help you identify it.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
							Query Name
						</Label>
						<Input
							id="name"
							value={name}
							onChange={handleNameChange}
							placeholder="e.g., Monthly Sales Report"
							autoFocus
							required
							className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
						/>
						{nameError && (
							<p className="text-sm text-red-500 dark:text-red-400">
								{nameError}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label
							htmlFor="description"
							className="text-gray-700 dark:text-gray-300"
						>
							Description (Optional)
						</Label>
						<Textarea
							id="description"
							value={description}
							onChange={handleDescriptionChange}
							placeholder="What does this query do?"
							rows={2}
							className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
						/>
					</div>

					<div className="bg-gray-50 dark:bg-gray-800 p-3 rounded mt-4 border border-gray-200 dark:border-gray-700">
						<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
							QUERY PREVIEW
						</p>
						<pre className="text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap overflow-hidden text-ellipsis max-h-[60px]">
							{sql}
						</pre>
					</div>
				</div>

				<DialogFooter className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3">
					<Button
						variant="outline"
						onClick={onClose}
						className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={!name.trim()}
						className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white disabled:bg-blue-400 dark:disabled:bg-blue-800"
					>
						Save Query
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default SaveQueryModal;

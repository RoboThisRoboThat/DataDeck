import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import Editor from "@monaco-editor/react";

interface JsonEditorDialogProps {
	open: boolean;
	value: string;
	onValueChange: (value: string) => void;
	onSave: () => void;
	onClose: () => void;
}

/**
 * Modal dialog with Monaco editor for editing JSON values
 */
export function JsonEditorDialog({
	open,
	value,
	onValueChange,
	onSave,
	onClose,
}: JsonEditorDialogProps) {
	const [isValid, setIsValid] = useState(true);

	const handleEditorChange = (newValue: string | undefined) => {
		const val = newValue || "";
		onValueChange(val);

		// Validate JSON
		try {
			JSON.parse(val);
			setIsValid(true);
		} catch {
			setIsValid(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Edit JSON Value</DialogTitle>
				</DialogHeader>

				<div className="flex-1 min-h-[400px] border rounded-md overflow-hidden">
					<Editor
						height="100%"
						defaultLanguage="json"
						value={value}
						onChange={handleEditorChange}
						options={{
							minimap: { enabled: false },
							fontSize: 14,
							lineNumbers: "on",
							scrollBeyondLastLine: false,
							automaticLayout: true,
							tabSize: 2,
							formatOnPaste: true,
							formatOnType: true,
						}}
						theme="vs-dark"
					/>
				</div>

				{!isValid && (
					<div className="text-sm text-destructive">
						Invalid JSON. Please fix syntax errors before saving.
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={onSave} disabled={!isValid}>
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

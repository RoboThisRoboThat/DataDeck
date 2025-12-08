import { useState } from "react";
import { Terminal, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CommandConsoleProps {
	commandInput: string;
	commandResult: unknown;
	isExecuting: boolean;
	onCommandChange: (value: string) => void;
	onExecute: () => void;
}

/**
 * Console for executing raw Redis commands
 */
export function CommandConsole({
	commandInput,
	commandResult,
	isExecuting,
	onCommandChange,
	onExecute,
}: CommandConsoleProps) {
	const [commandHistory, setCommandHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !isExecuting) {
			if (commandInput.trim()) {
				setCommandHistory((prev) => [commandInput, ...prev.slice(0, 49)]);
				setHistoryIndex(-1);
			}
			onExecute();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (historyIndex < commandHistory.length - 1) {
				const newIndex = historyIndex + 1;
				setHistoryIndex(newIndex);
				onCommandChange(commandHistory[newIndex]);
			}
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			if (historyIndex > 0) {
				const newIndex = historyIndex - 1;
				setHistoryIndex(newIndex);
				onCommandChange(commandHistory[newIndex]);
			} else if (historyIndex === 0) {
				setHistoryIndex(-1);
				onCommandChange("");
			}
		}
	};

	const formatResult = (result: unknown): string => {
		if (result === null || result === undefined) {
			return "(nil)";
		}
		if (typeof result === "string") {
			return `"${result}"`;
		}
		if (typeof result === "number") {
			return `(integer) ${result}`;
		}
		if (Array.isArray(result)) {
			if (result.length === 0) {
				return "(empty array)";
			}
			return result
				.map((item, i) => `${i + 1}) ${formatResult(item)}`)
				.join("\n");
		}
		if (typeof result === "object" && "error" in (result as object)) {
			return `(error) ${(result as { error: string }).error}`;
		}
		return JSON.stringify(result, null, 2);
	};

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Terminal className="h-4 w-4" />
					Command Console
				</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col gap-4">
				{/* Command Input */}
				<div className="flex gap-2">
					<div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3">
						<span className="text-muted-foreground font-mono">{">"}</span>
						<Input
							value={commandInput}
							onChange={(e) => onCommandChange(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Enter Redis command (e.g., GET key, SET key value)"
							className="border-0 bg-transparent focus-visible:ring-0 font-mono"
							disabled={isExecuting}
						/>
					</div>
					<Button
						onClick={onExecute}
						disabled={isExecuting || !commandInput.trim()}
					>
						<Play className="h-4 w-4 mr-1" />
						{isExecuting ? "Running..." : "Run"}
					</Button>
				</div>

				{/* Result Display */}
				<div className="flex-1 bg-muted rounded-md p-4 overflow-auto">
					{commandResult !== null ? (
						<pre className="font-mono text-sm whitespace-pre-wrap">
							{formatResult(commandResult)}
						</pre>
					) : (
						<div className="text-muted-foreground text-sm">
							<p>Enter a Redis command and press Enter or click Run.</p>
							<p className="mt-2">Examples:</p>
							<ul className="list-disc list-inside mt-1 space-y-1">
								<li>
									<code>GET mykey</code>
								</li>
								<li>
									<code>SET mykey "hello"</code>
								</li>
								<li>
									<code>KEYS *</code>
								</li>
								<li>
									<code>INFO</code>
								</li>
							</ul>
						</div>
					)}
				</div>

				{/* Command History Hint */}
				{commandHistory.length > 0 && (
					<div className="text-xs text-muted-foreground">
						Tip: Use ↑/↓ arrow keys to navigate command history
					</div>
				)}
			</CardContent>
		</Card>
	);
}

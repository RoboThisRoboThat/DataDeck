import { Search, RefreshCw, Trash, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTypeBadgeColor } from "../utils";

interface KeyListProps {
	keys: string[];
	selectedKey: string | null;
	searchPattern: string;
	isLoading: boolean;
	hasMoreKeys: boolean;
	onSearchPatternChange: (pattern: string) => void;
	onSearch: () => void;
	onSelectKey: (key: string) => void;
	onDeleteKey: (key: string) => void;
	onLoadMore: () => void;
	onRefresh: () => void;
	getKeyType?: (key: string) => string | undefined;
}

/**
 * Component for displaying and managing Redis keys list
 */
export function KeyList({
	keys,
	selectedKey,
	searchPattern,
	isLoading,
	hasMoreKeys,
	onSearchPatternChange,
	onSearch,
	onSelectKey,
	onDeleteKey,
	onLoadMore,
	onRefresh,
	getKeyType,
}: KeyListProps) {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			onSearch();
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Search Bar */}
			<div className="p-3 border-b flex gap-2">
				<Input
					value={searchPattern}
					onChange={(e) => onSearchPatternChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Search pattern (e.g., user:*)"
					className="flex-1"
				/>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="outline" size="icon" onClick={onSearch}>
								<Search className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Search keys</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="outline" size="icon" onClick={onRefresh}>
								<RefreshCw className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Refresh keys</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			{/* Keys List */}
			<div className="flex-1 overflow-auto">
				{isLoading && keys.length === 0 ? (
					<div className="p-4 text-center text-muted-foreground">
						Loading keys...
					</div>
				) : keys.length === 0 ? (
					<div className="p-4 text-center text-muted-foreground">
						<Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
						<p>No keys found</p>
						<p className="text-sm mt-1">Try a different search pattern</p>
					</div>
				) : (
					<ul className="divide-y">
						{keys.map((key) => {
							const keyType = getKeyType?.(key);
							return (
								<li
									key={key}
									className={`
                    flex items-center justify-between px-3 py-2 cursor-pointer
                    hover:bg-muted transition-colors
                    ${selectedKey === key ? "bg-muted" : ""}
                  `}
									onClick={() => onSelectKey(key)}
								>
									<div className="flex items-center gap-2 min-w-0 flex-1">
										{keyType && (
											<Badge
												variant="secondary"
												className={`text-xs ${getTypeBadgeColor(keyType)} text-white`}
											>
												{keyType}
											</Badge>
										)}
										<span className="truncate font-mono text-sm">{key}</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="opacity-0 hover:opacity-100 transition-opacity"
										onClick={(e) => {
											e.stopPropagation();
											onDeleteKey(key);
										}}
									>
										<Trash className="h-3 w-3 text-destructive" />
									</Button>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{/* Load More */}
			{hasMoreKeys && (
				<div className="p-3 border-t">
					<Button
						variant="outline"
						className="w-full"
						onClick={onLoadMore}
						disabled={isLoading}
					>
						{isLoading ? "Loading..." : "Load More Keys"}
					</Button>
				</div>
			)}

			{/* Key Count */}
			<div className="p-2 border-t text-sm text-muted-foreground text-center">
				{keys.length} key{keys.length !== 1 ? "s" : ""} loaded
			</div>
		</div>
	);
}

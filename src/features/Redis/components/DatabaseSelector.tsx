import { Database } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface DatabaseSelectorProps {
	currentDatabase: number;
	databaseCount: number;
	availableDatabases: number[];
	isLoading: boolean;
	onDatabaseChange: (dbNumber: number) => void;
}

/**
 * Dropdown for selecting Redis database
 */
export function DatabaseSelector({
	currentDatabase,
	databaseCount,
	availableDatabases,
	isLoading,
	onDatabaseChange,
}: DatabaseSelectorProps) {
	// Generate all database options
	const databases = Array.from({ length: databaseCount }, (_, i) => i);

	return (
		<div className="flex items-center gap-2">
			<Database className="h-4 w-4 text-muted-foreground" />
			<Select
				value={currentDatabase.toString()}
				onValueChange={(value) => onDatabaseChange(parseInt(value, 10))}
				disabled={isLoading}
			>
				<SelectTrigger className="w-[140px]">
					<SelectValue placeholder="Select DB" />
				</SelectTrigger>
				<SelectContent>
					{databases.map((db) => {
						const hasKeys = availableDatabases.includes(db);
						return (
							<SelectItem key={db} value={db.toString()}>
								<div className="flex items-center gap-2">
									<span>DB {db}</span>
									{hasKeys && (
										<Badge variant="secondary" className="text-xs">
											has keys
										</Badge>
									)}
								</div>
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
		</div>
	);
}

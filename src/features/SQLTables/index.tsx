import { useState, useEffect, useRef } from "react";
import TableList from "./components/TableList";
import TableTabs from "./components/TableTabs";
import DataTable from "./components/DataTable";
import QueryPanel from "../QueryPanel";
import ERDiagram from "./components/ERDiagram";
import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
} from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";

interface SQLTablesProps {
	connectionId: string;
	onDisconnect: () => void; // Not currently used but kept for future implementation
}

function SQLTables({ connectionId }: SQLTablesProps) {
	const [allTables, setAllTables] = useState<string[]>([]);
	const [tables, setTables] = useState<string[]>([]);
	const [activeTable, setActiveTable] = useState<string | null>(null);
	const [error, setError] = useState<string>("");
	const [tableSearch, setTableSearch] = useState("");
	const [loading, setLoading] = useState(false);
	const [currentActiveTab, setCurrentActiveTab] = useState("tables");

	// Store connectionId in a ref to ensure we can access it in async callbacks
	const connectionIdRef = useRef(connectionId);

	// Update ref when prop changes
	useEffect(() => {
		connectionIdRef.current = connectionId;
	}, [connectionId]);

	useEffect(() => {
		if (!connectionId) {
			setError("No connection ID provided");
			console.error("SQLTables: No connection ID provided");
			return;
		}

		console.log("SQLTables: Using connection ID:", connectionId);

		// Validate connection ID is not empty
		if (connectionId.trim() === "") {
			setError("Empty connection ID provided");
			console.error("SQLTables: Empty connection ID provided");
			return;
		}
		loadTables(connectionId);
	}, [connectionId]);

	const loadTables = async (connectionId: string) => {
		try {
			setLoading(true);
			setError("");
			console.log("Loading tables with connection ID:", connectionId);
			const tablesData = await window.database.getTables(connectionId);

			if (
				!tablesData ||
				!Array.isArray(tablesData) ||
				tablesData.length === 0
			) {
				console.log("No tables found or invalid response:", tablesData);
				setAllTables([]);
				return;
			}

			const firstRow = tablesData[0];
			const tableNameKey = Object.keys(firstRow)[0];
			const tableNames = tablesData.map(
				(table) => table[tableNameKey as keyof typeof table] as string,
			);
			console.log("Tables loaded successfully:", tableNames);
			setAllTables(tableNames);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			setError(`Failed to load tables: ${errorMessage}`);
			console.error("Failed to load tables:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleTableSelect = async (tableName: string) => {
		// Add the table to the list if it's not already there
		if (!tables.includes(tableName)) {
			setTables((prevTables) => [...prevTables, tableName]);
		}
		setActiveTable(tableName);
	};

	const handleCloseTable = (tableName: string, event: React.MouseEvent) => {
		event.stopPropagation();
		setTables((prev) => prev.filter((t) => t !== tableName));
		if (activeTable === tableName) {
			const remainingTables = tables.filter((t) => t !== tableName);
			setActiveTable(
				remainingTables.length > 0
					? remainingTables[remainingTables.length - 1]
					: null,
			);
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent, table: string) => {
		if (event.key === "Enter" || event.key === " ") {
			handleTableSelect(table);
		}
	};

	return (
		<div className="flex flex-col h-full w-full">
			<Tabs
				defaultValue="tables"
				value={currentActiveTab}
				onValueChange={setCurrentActiveTab}
				className="flex-1 h-full flex flex-col"
			>
				<div className="border-b">
					<TabsList className="w-full justify-start rounded-none px-2 h-11 bg-background">
						<TabsTrigger
							value="tables"
							className="rounded-sm data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-3"
						>
							Tables
						</TabsTrigger>
						<TabsTrigger
							value="query"
							className="rounded-sm data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-3"
						>
							Query
						</TabsTrigger>
						<TabsTrigger
							value="er-diagram"
							className="rounded-sm data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-3"
						>
							ER Diagram
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent
					value="tables"
					className="flex h-full mt-0 border-none p-0"
				>
					<div
						className="flex flex-1 flex-row h-screen"
						id="main-tables-container"
					>
						<TableList
							tables={allTables}
							openTables={tables}
							activeTable={activeTable}
							tableSearch={tableSearch}
							setTableSearch={setTableSearch}
							handleTableSelect={handleTableSelect}
							handleKeyDown={handleKeyDown}
						/>

						{/* Main Content */}
						<div className="flex flex-col overflow-hidden bg-background">
							{loading && (
								<div className="p-4 m-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-400">
									Loading tables...
								</div>
							)}

							{error && (
								<div className="p-4 m-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md dark:border-destructive/30 dark:text-destructive-foreground">
									{error}
									<div className="mt-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => loadTables(connectionId)}
											className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 dark:bg-destructive/20 dark:border-destructive/30 dark:text-destructive-foreground"
										>
											Retry
										</Button>
									</div>
								</div>
							)}

							{/* Tabs Bar */}
							<TableTabs
								tables={tables}
								activeTable={activeTable}
								setActiveTable={setActiveTable}
								handleCloseTable={handleCloseTable}
							/>

							{/* Table Content */}
							<div
								style={{ width: "calc(100vw - 256px)" }}
								className="flex-1 overflow-hidden"
							>
								{activeTable ? (
									<div className="flex-1 h-full flex flex-col">
										{/* Data Table */}
										<div className="overflow-auto">
											<DataTable
												tableName={activeTable}
												connectionId={connectionId}
											/>
										</div>
									</div>
								) : (
									<div className="h-full flex items-center justify-center text-muted-foreground mx-auto w-full">
										<div className="text-center w-fit">
											<p className="text-lg">
												Select a table from the sidebar to view its data
											</p>
											<p className="text-sm mt-2">
												{tables.length} tables available
											</p>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</TabsContent>

				<TabsContent
					value="query"
					className="flex-1 h-full mt-0 border-none p-0"
				>
					<div id="query-panel-container" className="h-full">
						<QueryPanel connectionId={connectionId} tables={allTables} />
					</div>
				</TabsContent>

				<TabsContent
					value="er-diagram"
					className="flex-1 h-full mt-0 border-none p-0"
				>
					<div id="er-diagram-container" className="h-full">
						<ERDiagram connectionId={connectionId} />
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default SQLTables;

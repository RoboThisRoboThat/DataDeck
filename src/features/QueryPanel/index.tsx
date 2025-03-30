import { useState, useEffect, useRef, useCallback } from "react";
import {
	FiPlay,
	FiSave,
	FiCopy,
	FiDownload,
	FiStopCircle,
	FiClock,
	FiChevronRight,
	FiAlertTriangle,
	FiCheckCircle,
} from "react-icons/fi";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../../components/ui/tooltip";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../../components/ui/dialog";
import QueryEditor from "./components/QueryEditor";
import QueryResults from "./components/QueryResults";
import Sidebar from "./components/Sidebar";
import SaveQueryModal from "./components/SaveQueryModal";
import { IoClose } from "react-icons/io5";

interface QueryPanelProps {
	connectionId: string;
	tables?: string[];
}

interface DatabaseQueryResult {
	rows?: Record<string, unknown>[];
	data?: Record<string, unknown>[];
	columns?: string[];
	affectedRows?: number;
	isSelect?: boolean;
}

interface QueryResult {
	id: string;
	sql: string;
	data: Record<string, unknown>[];
	columns: string[];
	error?: string;
	status: "running" | "completed" | "error";
	executionTime?: number;
	affectedRows?: number;
	isSelect?: boolean;
}

// Add Editor reference type
interface EditorRefType {
	focus: () => void;
	getSelectedText: () => string;
}

function QueryPanel({ connectionId, tables = [] }: QueryPanelProps) {
	const editorRef = useRef<EditorRefType | null>(null);

	// Initialize with width from localStorage or default to 320px
	const [sidebarWidth, setSidebarWidth] = useState(() => {
		const savedWidth = localStorage.getItem("querySidebarWidth");
		return savedWidth ? Number.parseInt(savedWidth, 10) : 320;
	});
	const [isResizing, setIsResizing] = useState(false);

	// State for editor
	const [sql, setSql] = useState<string>("SELECT * FROM ");
	const [selectedText, setSelectedText] = useState<string>("");
	const [isExecuting, setIsExecuting] = useState<boolean>(false);

	// Track the currently loaded query name
	const [currentQueryName, setCurrentQueryName] = useState<string | null>(
		"Unsaved Query",
	);

	// State for saved queries
	const [savedQueries, setSavedQueries] = useState<
		Array<{
			name: string;
			sql: string;
			createdAt: string;
			description?: string;
		}>
	>([]);
	const [loadingSavedQueries, setLoadingSavedQueries] = useState<boolean>(true);
	const [savedQueriesError, setSavedQueriesError] = useState<string | null>(
		null,
	);

	// Function to fetch saved queries - memoized with useCallback
	const fetchSavedQueries = useCallback(async () => {
		setLoadingSavedQueries(true);
		setSavedQueriesError(null);

		try {
			const result = await window.electron.ipcRenderer.invoke(
				"get-saved-queries",
				{
					connectionId,
				},
			);

			if (result.error) {
				setSavedQueriesError(result.error);
				setSavedQueries([]);
			} else {
				// Filter out the unsaved query for display
				const queries = result.queries.filter(
					(query: { name: string; sql: string }) =>
						query.name !== "Unsaved Query",
				);
				setSavedQueries(queries);
			}
		} catch (err: unknown) {
			const error = err as Error;
			setSavedQueriesError(error.message || "Failed to load saved queries");
			setSavedQueries([]);
		} finally {
			setLoadingSavedQueries(false);
		}
	}, [connectionId]);

	// Load saved queries on mount and when fetchSavedQueries changes
	useEffect(() => {
		fetchSavedQueries();
	}, [fetchSavedQueries]);

	// Load unsaved query on initial mount
	useEffect(() => {
		const loadUnsavedQuery = async () => {
			try {
				const result = await window.electron.ipcRenderer.invoke(
					"get-saved-queries",
					{
						connectionId,
					},
				);

				if (!result.error) {
					// Find the unsaved query
					const unsavedQuery = result.queries.find(
						(q: { name: string; sql: string }) => q.name === "Unsaved Query",
					);

					// If we have an unsaved query, load it
					if (unsavedQuery?.sql) {
						setSql(unsavedQuery.sql);
					}
				}
			} catch (error) {
				console.error("Error loading unsaved query:", error);
			}
		};

		loadUnsavedQuery();
	}, [connectionId]);

	// Auto-save effect
	useEffect(() => {
		const autoSaveQuery = async () => {
			if (!currentQueryName) return;

			try {
				// Don't dispatch refresh events for auto-saves during typing
				const shouldRefresh = false;

				await window.electron.ipcRenderer.invoke("save-query", {
					connectionId,
					name: currentQueryName,
					sql,
					createdAt: new Date().toISOString(),
					shouldRefresh,
				});
			} catch (error) {
				console.error("Auto-save error:", error);
			}
		};

		// Debounce auto-save to prevent too frequent saves
		const timeoutId = setTimeout(autoSaveQuery, 1000);
		return () => clearTimeout(timeoutId);
	}, [sql, connectionId, currentQueryName]);

	// State for results
	const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
	const [activeResultIndex, setActiveResultIndex] = useState<number | null>(
		null,
	);

	// State for execution
	const [executionStartTime, setExecutionStartTime] = useState<number | null>(
		null,
	);
	const [elapsedTime, setElapsedTime] = useState<number>(0);
	const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
		null,
	);

	// State for UI
	const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Ensure activeResultIndex is valid when queryResults change
	useEffect(() => {
		if (
			activeResultIndex === null ||
			activeResultIndex < 0 ||
			activeResultIndex >= queryResults.length
		) {
			if (queryResults.length > 0) {
				setActiveResultIndex(queryResults.length - 1);
			}
		}
	}, [queryResults, activeResultIndex]);

	// Clear timer when component unmounts
	useEffect(() => {
		return () => {
			if (timerInterval) {
				clearInterval(timerInterval);
			}
		};
	}, [timerInterval]);

	// Start timer for query execution
	const startTimer = () => {
		const startTime = Date.now();
		setExecutionStartTime(startTime);

		const interval = setInterval(() => {
			setElapsedTime(Date.now() - startTime);
		}, 100);

		setTimerInterval(interval);
	};

	// Stop timer
	const stopTimer = () => {
		if (timerInterval) {
			clearInterval(timerInterval);
			setTimerInterval(null);
		}

		// Capture final execution time if we have a start time
		if (executionStartTime) {
			const finalTime = Date.now() - executionStartTime;
			setElapsedTime(finalTime);
			setExecutionStartTime(null);
			return finalTime;
		}

		return elapsedTime;
	};

	// Format execution time
	const formatExecutionTime = (ms: number): string => {
		if (ms < 1000) {
			return `${ms}ms`;
		}

		const seconds = ms / 1000;
		if (seconds < 60) {
			return `${seconds.toFixed(2)}s`;
		}

		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
	};

	// Execute SQL query
	const executeQuery = async (runSelectedOnly = false) => {
		if (isExecuting) return;

		const queryToExecute = runSelectedOnly ? selectedText : sql;
		if (!queryToExecute.trim()) return;

		setIsExecuting(true);
		setError(null);

		// Split into multiple queries if semicolons are present
		const queries = queryToExecute
			.split(";")
			.map((q) => q.trim())
			.filter((q) => q.length > 0);

		if (queries.length === 0) {
			setIsExecuting(false);
			return;
		}

		// Track all new result IDs to ensure we can find them later
		const resultIds: string[] = [];
		// Create a new results array with all existing results
		let newQueryResults = [...queryResults];

		// First, create all the tabs for each query
		for (let i = 0; i < queries.length; i++) {
			const queryText = queries[i];
			if (!queryText.trim()) continue;

			// Create a unique ID for this query result
			const resultId = `${Date.now()}-${i}`;
			resultIds.push(resultId);

			// Add a new result tab for this query
			const newResult: QueryResult = {
				id: resultId,
				sql: queryText,
				data: [],
				columns: [],
				status: "running",
				executionTime: 0,
			};

			newQueryResults = [...newQueryResults, newResult];
		}

		// Update state with all new tabs
		setQueryResults(newQueryResults);

		// Set the first new tab as active if this is our first query
		if (activeResultIndex === null && resultIds.length > 0) {
			setActiveResultIndex(queryResults.length);
		}

		// Now execute each query in sequence
		for (let i = 0; i < queries.length; i++) {
			const queryText = queries[i];
			if (!queryText.trim() || i >= resultIds.length) continue;

			const resultId = resultIds[i];

			// Start the timer for this specific query
			startTimer();

			try {
				// Execute this specific query
				const result = (await window.database.query(
					connectionId,
					queryText,
				)) as unknown as DatabaseQueryResult | Record<string, unknown>[];
				const executionTime = stopTimer();

				// Update results with success
				setQueryResults((prev) =>
					prev.map((res) => {
						if (res.id === resultId) {
							let resultData: Record<string, unknown>[] = [];
							let resultColumns: string[] = [];
							let isSelect = true;
							let affectedRows: number | undefined;

							if (Array.isArray(result)) {
								// Result is an array of records
								resultData = result;
								if (result.length > 0) {
									resultColumns = Object.keys(result[0]);
								}
							} else {
								// Result is an object with possible properties like rows, data, columns
								if (result.rows) {
									resultData = result.rows as Record<string, unknown>[];
								} else if (result.data) {
									resultData = result.data as Record<string, unknown>[];
								}

								if (result.columns) {
									resultColumns = result.columns as string[];
								} else if (resultData.length > 0) {
									resultColumns = Object.keys(resultData[0]);
								}

								// Handle non-SELECT queries
								if (result.isSelect === false) {
									isSelect = false;
								}

								if (result.affectedRows !== undefined) {
									affectedRows = result.affectedRows as number;
								}
							}

							return {
								...res,
								data: resultData,
								columns: resultColumns,
								executionTime,
								status: "completed",
								isSelect,
								affectedRows,
							};
						}
						return res;
					}),
				);
			} catch (err: unknown) {
				console.error("Query execution error:", err);
				const executionTime = stopTimer();

				const error = err as Error;

				// Update with error information
				setQueryResults((prev) =>
					prev.map((res) =>
						res.id === resultId
							? {
									...res,
									error: error.message || "Failed to execute query",
									executionTime,
									status: "error",
								}
							: res,
					),
				);
			}
		}

		setIsExecuting(false);
	};

	// Stop query execution
	const stopExecution = async () => {
		try {
			await window.electron.ipcRenderer.invoke("stop-query", {
				connectionId,
			});

			setIsExecuting(false);
			stopTimer();

			// Mark running queries as stopped with error
			setQueryResults((prev) =>
				prev.map((res) =>
					res.status === "running"
						? {
								...res,
								error: "Query execution was cancelled",
								executionTime: elapsedTime,
								status: "error",
							}
						: res,
				),
			);
		} catch (err: unknown) {
			const error = err as Error;
			setError(error.message || "Failed to stop query execution");
		}
	};

	// Handle editor selection change
	const handleSelectionChange = (text: string) => {
		setSelectedText(text);
	};

	// Open save query modal
	const openSaveModal = () => {
		if (!sql.trim()) {
			setError("Cannot save empty query");
			return;
		}

		setSaveModalOpen(true);
	};

	// Save the current query
	const saveQuery = async (name: string, description?: string) => {
		if (!sql.trim() || !name.trim()) {
			setError("Query name and SQL are required");
			return;
		}

		try {
			// Save the query with the new name - explicitly set shouldRefresh to true
			const result = await window.electron.ipcRenderer.invoke("save-query", {
				connectionId,
				name,
				sql,
				description,
				createdAt: new Date().toISOString(),
				shouldRefresh: true, // Explicit refresh when manually saving
			});

			if (result.error) {
				setError(result.error);
			} else {
				// Clear the unsaved query content - explicitly set shouldRefresh to false
				await window.electron.ipcRenderer.invoke("save-query", {
					connectionId,
					name: "Unsaved Query",
					sql: "",
					createdAt: new Date().toISOString(),
					shouldRefresh: false, // Don't refresh when clearing unsaved
				});

				// Update current query name to the new saved query
				setCurrentQueryName(name);

				// Reset the SQL in the editor if we were editing the unsaved query
				if (currentQueryName === "Unsaved Query") {
					setSql("SELECT * FROM ");
				}

				setSaveModalOpen(false);

				// Refresh the saved queries list
				fetchSavedQueries();
			}
		} catch (err: unknown) {
			const error = err as Error;
			setError(error.message || "Failed to save query");
		}
	};

	// Load a saved query
	const loadQuery = (savedSql: string, queryName: string) => {
		setSql(savedSql);
		setCurrentQueryName(queryName);

		// Focus on the editor
		if (editorRef.current?.focus) {
			editorRef.current.focus();
		}
	};

	// Delete a saved query
	const deleteQuery = async (name: string): Promise<void> => {
		try {
			interface DeleteQueryResponse {
				error?: string;
				success?: boolean;
			}

			const result = (await window.electron.ipcRenderer.invoke("delete-query", {
				connectionId,
				name,
			})) as DeleteQueryResponse;

			if (result.error) {
				setError(result.error);
			} else {
				// Refresh the saved queries list after deletion
				fetchSavedQueries();
			}
		} catch (error: unknown) {
			const err = error as Error;
			setError(err.message || "Failed to delete query");
		}
	};

	// Copy query to clipboard
	const copyQuery = () => {
		if (!sql.trim()) return;

		navigator.clipboard
			.writeText(sql)
			.then(() => {
				const tempError = error;
				setError("Query copied to clipboard");
				setTimeout(() => setError(tempError), 2000);
			})
			.catch(() => {
				setError("Failed to copy query to clipboard");
			});
	};

	// Export current result in various formats
	const exportResult = (format: "csv" | "json" | "sql") => {
		// If no active tab or no results, do nothing
		if (activeResultIndex === null || !queryResults[activeResultIndex]) {
			return;
		}

		const result = queryResults[activeResultIndex];

		// If no data or columns, do nothing
		if (!result.data.length || !result.columns.length) {
			setError("No data to export");
			return;
		}

		try {
			let content = "";
			let fileType = "";
			let fileExtension = "";

			if (format === "csv") {
				// Create CSV content
				const header = result.columns.join(",");
				const rows = result.data
					.map((row) => {
						return result.columns
							.map((column) => {
								const value = row[column];
								// Handle null, undefined and different types
								if (value === null || value === undefined) {
									return "";
								}
								if (typeof value === "object") {
									return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
								}
								return typeof value === "string" &&
									(value.includes(",") || value.includes('"'))
									? `"${value.replace(/"/g, '""')}"`
									: String(value);
							})
							.join(",");
					})
					.join("\n");

				content = `${header}\n${rows}`;
				fileType = "text/csv;charset=utf-8;";
				fileExtension = "csv";
			} else if (format === "json") {
				// Create JSON content
				const jsonData = result.data.map((row) => {
					const rowObject: Record<string, unknown> = {};
					for (const column of result.columns) {
						rowObject[column] = row[column];
					}
					return rowObject;
				});

				content = JSON.stringify(jsonData, null, 2);
				fileType = "application/json;charset=utf-8;";
				fileExtension = "json";
			} else if (format === "sql") {
				// Create SQL INSERT statements
				const tableName = "exported_data";

				const insertStatements = [];
				for (const row of result.data) {
					const values = result.columns.map((column) => {
						const value = row[column];

						if (value === null || value === undefined) {
							return "NULL";
						}
						if (typeof value === "string") {
							return `'${value.replace(/'/g, "''")}'`;
						}
						if (typeof value === "boolean") {
							return value ? "1" : "0";
						}
						if (typeof value === "object") {
							return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
						}
						return String(value);
					});

					insertStatements.push(
						`INSERT INTO ${tableName} (${result.columns.join(", ")}) VALUES (${values.join(", ")});`,
					);
				}

				content = `-- Export from Date Crunch
-- Table structure
CREATE TABLE ${tableName} (
${result.columns.map((col) => `  ${col} TEXT`).join(",\n")}
);

-- Data
${insertStatements.join("\n")}`;

				fileType = "text/plain;charset=utf-8;";
				fileExtension = "sql";
			}

			// Create download link
			const blob = new Blob([content], { type: fileType });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute(
				"download",
				`query-result-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.${fileExtension}`,
			);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (err) {
			const error = err as Error;
			setError(error.message || `Failed to export as ${format.toUpperCase()}`);
		}
	};

	// Render result tabs
	const renderResultTabs = () => {
		if (queryResults.length === 0) {
			return null;
		}

		// Ensure activeResultIndex is valid
		const validIndex =
			activeResultIndex !== null &&
			activeResultIndex >= 0 &&
			activeResultIndex < queryResults.length
				? activeResultIndex
				: queryResults.length - 1;

		return (
			<div className="border-b border-border">
				<Tabs
					value={validIndex.toString()}
					onValueChange={(value) => {
						setActiveResultIndex(Number(value));
					}}
					className="min-h-[48px]"
				>
					<TabsList className="bg-transparent w-full h-full flex overflow-auto scrollbar-hide gap-0.5 rounded-none p-0 pl-1">
						{queryResults.map((result, index) => {
							// Format the query text for display (truncate and clean up)
							const displayQuery =
								result.sql.replace(/\s+/g, " ").trim().substring(0, 30) +
								(result.sql.length > 30 ? "..." : "");

							return (
								<TabsTrigger
									key={result.id}
									value={index.toString()}
									className="flex items-center gap-2 py-1.5 px-3 h-9 rounded-sm rounded-b-none border-border border-b-0 data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-b-0 data-[state=active]:border-t-2 data-[state=active]:border-t-primary relative group"
								>
									<div className="flex items-center">
										{result.status === "running" ? (
											<div className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full mr-2" />
										) : result.status === "error" ? (
											<FiAlertTriangle className="text-destructive size-3.5 mr-2" />
										) : (
											<FiCheckCircle className="text-primary size-3.5 mr-2" />
										)}

										<span className="max-w-[150px] truncate text-xs font-medium">
											{displayQuery}
										</span>

										{result.executionTime ? (
											<span className="text-xs text-muted-foreground font-mono ml-2">
												{formatExecutionTime(result.executionTime)}
											</span>
										) : null}
									</div>

									<Button
										variant="ghost"
										size="icon"
										className="h-5 w-5 p-0 absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
										onClick={(e) => {
											e.stopPropagation();

											// Remove tab
											const newResults = [...queryResults];
											newResults.splice(index, 1);
											setQueryResults(newResults);

											// Update active tab
											if (activeResultIndex !== null) {
												if (index === activeResultIndex) {
													setActiveResultIndex(
														newResults.length > 0
															? Math.min(index, newResults.length - 1)
															: null,
													);
												} else if (index < activeResultIndex) {
													setActiveResultIndex(activeResultIndex - 1);
												}
											}
										}}
									>
										<IoClose className="size-3" />
									</Button>
								</TabsTrigger>
							);
						})}
					</TabsList>
				</Tabs>
			</div>
		);
	};

	// Render current active result
	const renderActiveResult = () => {
		if (queryResults.length === 0) {
			return (
				<div className="flex-1 flex items-center justify-center p-4">
					<div className="text-center text-muted-foreground">
						<p>No query results yet</p>
						<p className="text-sm mt-1">Run a query to see results here</p>
					</div>
				</div>
			);
		}

		const activeResult =
			activeResultIndex !== null ? queryResults[activeResultIndex] : null;

		if (!activeResult) {
			return (
				<div className="flex-1 flex items-center justify-center p-4">
					<div className="text-center text-muted-foreground">
						<p>No active result selected</p>
						<p className="text-sm mt-1">Please select a tab to view results</p>
					</div>
				</div>
			);
		}

		// If query is running
		if (activeResult.status === "running") {
			return (
				<div className="flex-1 flex flex-col items-center justify-center p-4">
					<div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mb-4" />
					<p className="text-center text-muted-foreground">
						Executing query...
					</p>
					<p className="text-center text-muted-foreground text-sm">
						{formatExecutionTime(elapsedTime)}
					</p>
				</div>
			);
		}

		// If query has error
		if (activeResult.error) {
			return (
				<div className="m-4 p-4 bg-red-50 border border-red-200 rounded">
					<p className="text-red-800 font-medium mb-2">Error executing query</p>
					<p className="text-red-700 font-mono whitespace-pre-wrap">
						{activeResult.error}
					</p>
				</div>
			);
		}

		// If non-SELECT query with affected rows
		if (
			activeResult.isSelect === false &&
			activeResult.affectedRows !== undefined
		) {
			return (
				<div className="m-4 p-4 bg-green-50 border border-green-200 rounded">
					<p className="text-green-800 font-medium mb-2">
						Query executed successfully
					</p>
					<p className="text-green-700">
						{activeResult.affectedRows}{" "}
						{activeResult.affectedRows === 1 ? "row" : "rows"} affected
					</p>
					<p className="text-green-600 mt-2 block">
						Execution time:{" "}
						{formatExecutionTime(activeResult.executionTime || 0)}
					</p>
				</div>
			);
		}

		// For SELECT queries, show the results table
		// Check that we have data to display
		if (activeResult.data && activeResult.columns) {
			return (
				<div className="flex-1">
					<QueryResults
						data={activeResult.data}
						columns={activeResult.columns}
						loading={false}
					/>
				</div>
			);
		}

		// Handle the case where we have no data but no error
		return (
			<div className="m-4 p-4 bg-blue-50 border border-blue-200 rounded">
				<p className="text-blue-800 font-medium mb-2">
					Query executed successfully
				</p>
				<p className="text-blue-700">No data returned</p>
			</div>
		);
	};

	// Handle resize start
	const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
		setIsResizing(true);
		mouseDownEvent.preventDefault();
	}, []);

	// Reset to default width on double click
	const handleDoubleClick = useCallback(() => {
		const defaultWidth = 320;
		setSidebarWidth(defaultWidth);
	}, []);

	// Handle mouse move during resize
	useEffect(() => {
		const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
			if (isResizing) {
				const newWidth = mouseMoveEvent.clientX;
				// Set min and max limits for sidebar width
				if (newWidth > 200 && newWidth < 600) {
					setSidebarWidth(newWidth);
				}
			}
		};

		const handleMouseUp = () => {
			setIsResizing(false);
		};

		if (isResizing) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizing]);

	// Save sidebar width to localStorage when it changes
	useEffect(() => {
		localStorage.setItem("querySidebarWidth", sidebarWidth.toString());
	}, [sidebarWidth]);

	return (
		<div className="flex h-full overflow-hidden">
			{/* Sidebar with dynamic width */}
			<div
				className="flex-none border-r border-gray-200 bg-white overflow-auto"
				style={{ width: `${sidebarWidth}px` }}
			>
				<Sidebar
					connectionId={connectionId}
					onSelectQuery={(savedSql, queryName) =>
						loadQuery(savedSql, queryName)
					}
					onDeleteQuery={deleteQuery}
					currentQueryName={currentQueryName}
					queries={savedQueries}
					loading={loadingSavedQueries}
					error={savedQueriesError}
					onRefetchQueries={fetchSavedQueries}
				/>
			</div>

			{/* Resizer */}
			<div
				className="w-1.5 hover:w-2 bg-gray-200 relative cursor-col-resize hover:bg-indigo-400 active:bg-indigo-500 transition-all duration-200 flex items-center justify-center"
				onMouseDown={startResizing}
				onDoubleClick={handleDoubleClick}
			>
				{/* Resize handle indicator */}
				<div className="absolute h-8 flex flex-col items-center justify-center">
					<div className="w-1 h-1 bg-gray-400 rounded-full my-0.5" />
					<div className="w-1 h-1 bg-gray-400 rounded-full my-0.5" />
					<div className="w-1 h-1 bg-gray-400 rounded-full my-0.5" />
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 flex bg-gray-100 overflow-hidden">
				{/* Content Container with no max-width */}
				<div className="w-full flex flex-col overflow-hidden bg-white">
					{/* Header with actions */}
					<div className="border-b border-gray-200 shadow-sm flex-none">
						<div className="flex justify-between items-center p-2">
							<h2 className="text-gray-800 font-semibold text-lg">
								SQL Query Editor
							</h2>

							<div className="flex items-center gap-2">
								{/* Currently executing timer */}
								{isExecuting && (
									<div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md mr-1">
										<FiClock className="mr-1" size={14} />
										<span className="text-sm font-mono">
											{formatExecutionTime(elapsedTime)}
										</span>
									</div>
								)}

								{/* Execute button */}
								{!isExecuting ? (
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="default"
													size="sm"
													onClick={() => executeQuery(false)}
													disabled={!sql.trim()}
													className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
												>
													<FiPlay className="mr-1 h-4 w-4" />
													Execute
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												Execute SQL query (Shift+Enter)
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								) : (
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="destructive"
													size="sm"
													onClick={stopExecution}
													className="shadow-md"
												>
													<FiStopCircle className="mr-1 h-4 w-4" />
													Stop
												</Button>
											</TooltipTrigger>
											<TooltipContent>Stop query execution</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}

								{/* Execute Selection button - show only when text is selected */}
								{selectedText && (
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="outline"
													size="sm"
													onClick={() => executeQuery(true)}
													disabled={isExecuting}
													className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
												>
													<FiChevronRight className="mr-1 h-4 w-4" />
													Run Selection
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												Execute selected SQL (Cmd+Enter)
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}

								{/* Save button */}
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												onClick={openSaveModal}
												disabled={!sql.trim() || isExecuting}
												className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
											>
												<FiSave className="mr-1 h-4 w-4" />
												Save
											</Button>
										</TooltipTrigger>
										<TooltipContent>Save query</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								{/* Copy button */}
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={copyQuery}
												disabled={!sql.trim() || isExecuting}
												className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8"
											>
												<FiCopy className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Copy to clipboard</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								{/* Export button - only enabled when there are results */}
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => exportResult("csv")}
												disabled={
													!queryResults.length ||
													activeResultIndex === null ||
													!queryResults[activeResultIndex]?.data.length
												}
												className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8"
											>
												<FiDownload className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Export as CSV</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>
					</div>

					{/* Main content area with reduced padding */}
					<div className="flex flex-col flex-grow overflow-hidden">
						{/* Query editor with fixed height and minimal margin */}
						<div className="flex flex-col h-[300px] m-1">
							{/* Query editor container */}
							<div className="flex-grow border border-gray-200 rounded-md shadow-sm bg-white overflow-hidden">
								<QueryEditor
									value={sql}
									onChange={setSql}
									onExecute={() => executeQuery(false)}
									isExecuting={isExecuting}
									onSelectionChange={handleSelectionChange}
									ref={editorRef}
									connectionId={connectionId}
									tables={tables}
								/>
							</div>

							{/* Error message if any */}
							{error && (
								<div
									className={`mt-2 p-2 ${
										error.includes("copied to clipboard")
											? "bg-green-50 border-green-200 text-green-700"
											: "bg-red-50 border-red-200 text-red-700"
									} border rounded-md`}
								>
									<div className="flex items-center">
										{error.includes("copied to clipboard") ? (
											<FiCheckCircle className="mr-2" size={16} />
										) : (
											<FiAlertTriangle className="mr-2" size={16} />
										)}
										<p className="text-sm">{error}</p>
									</div>
								</div>
							)}
						</div>

						{/* Results area with minimal margin */}
						<div className="flex flex-col h-[calc(100vh-500px)] min-h-[400px] m-1 mt-2 overflow-hidden border border-gray-200 rounded-md shadow-sm bg-white">
							{/* Result tabs - Fixed */}
							<div className="flex-none border-b border-gray-200">
								{renderResultTabs()}
							</div>

							{/* Results content - Scrollable */}
							<div className="flex-1 overflow-hidden">
								{renderActiveResult()}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Save Query Modal */}
			<Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Save Query</DialogTitle>
						<DialogDescription>
							Enter a name and description for your query
						</DialogDescription>
					</DialogHeader>
					<SaveQueryModal
						open={saveModalOpen}
						onClose={() => setSaveModalOpen(false)}
						onSave={saveQuery}
						sql={sql}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default QueryPanel;

import { useState, useEffect, useCallback } from "react";
import { useScreen } from "../context/ScreenContext";
import { Layout } from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
	Search,
	RefreshCw,
	Trash,
	Database,
	Terminal,
	Clock,
	Edit,
	Check,
	X,
} from "lucide-react";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../components/ui/tabs";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useToast } from "../components/ui/use-toast";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../components/ui/dialog";
import Editor from "@monaco-editor/react";
import debounce from "lodash.debounce";
import { FileUp } from "lucide-react";
import FuzzySearch from "fuzzy-search";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

// Define types for Redis key values
type KeyInfo = {
	type: string;
	ttl: number;
	size: number;
};

type KeyValue = {
	type: string;
	value: unknown;
};

type ServerInfo = Record<string, Record<string, string>>;

// Define type for command logs
type CommandLog = {
	timestamp: string;
	duration: number;
	command: string;
};

export function RedisScreen() {
	const { activeConnectionId, activeConnectionName } = useScreen();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(true);
	const [isConnecting, setIsConnecting] = useState(false);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [keys, setKeys] = useState<string[]>([]);
	const [searchPattern, setSearchPattern] = useState("*");
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
	const [keyValue, setKeyValue] = useState<KeyValue | null>(null);
	const [scanCursor, setScanCursor] = useState("0");
	const [hasMoreKeys, setHasMoreKeys] = useState(false);
	const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
	const [commandInput, setCommandInput] = useState("");
	const [commandResult, setCommandResult] = useState<unknown>(null);
	const [activeTab, setActiveTab] = useState("browser");
	const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
	const [isLoadingLogs, setIsLoadingLogs] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [logsPerPage, setLogsPerPage] = useState(10);
	const [totalLogs, setTotalLogs] = useState(0);
	const [currentDatabase, setCurrentDatabase] = useState<number>(0);
	const [databaseCount, setDatabaseCount] = useState<number>(16);
	const [availableDatabases, setAvailableDatabases] = useState<number[]>([0]);
	const [isDatabaseLoading, setIsDatabaseLoading] = useState(false);
	const [keyBeingRenamed, setKeyBeingRenamed] = useState<string | null>(null);
	const [newKeyName, setNewKeyName] = useState<string>("");
	const [editingValue, setEditingValue] = useState<{
		field: string;
		value: string;
	} | null>(null);
	const [editingFieldName, setEditingFieldName] = useState<{
		oldField: string;
		newField: string;
	} | null>(null);
	const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
	const [jsonEditorValue, setJsonEditorValue] = useState("");
	const [editingJsonField, setEditingJsonField] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredKeyValue, setFilteredKeyValue] = useState<{
		type: string;
		value: unknown;
	} | null>(null);

	// Get the connection details and establish Redis connection
	useEffect(() => {
		if (activeConnectionId) {
			// Check that we're dealing with a Redis connection
			const checkConnectionType = async () => {
				const connections = await window.store.getConnections();
				const connection = connections.find(
					(conn) => conn.id === activeConnectionId,
				);

				if (!connection) {
					setConnectionError("Connection not found");
					return;
				}

				if (connection.dbType !== "redis") {
					setConnectionError("This is not a Redis connection");
					return;
				}

				// Only then try to connect
				initiateRedisConnection();
			};

			checkConnectionType();
		}

		// Cleanup on unmount - disconnect from Redis
		return () => {
			if (activeConnectionId) {
				window.redis
					.disconnect(activeConnectionId)
					.catch((error) =>
						console.error("Error disconnecting from Redis:", error),
					);
			}
		};
	}, [activeConnectionId]);

	// Initialize Redis connection
	const initiateRedisConnection = async () => {
		if (!activeConnectionId) return;

		setIsConnecting(true);
		setConnectionError(null);

		try {
			// Get the connection details
			const connections = await window.store.getConnections();
			const connection = connections.find(
				(conn) => conn.id === activeConnectionId,
			);

			if (!connection) {
				throw new Error("Connection not found");
			}

			if (connection.dbType !== "redis") {
				throw new Error("Selected connection is not a Redis connection");
			}

			// Connect to Redis
			const result = await window.redis.connect(activeConnectionId, connection);

			if (!result.success) {
				throw new Error(result.message || "Failed to connect to Redis");
			}

			// Load data after successful connection
			await loadKeys();
			await loadServerInfo();
			// Load initial command logs
			await loadCommandLogs();

			// Get database count and current database
			await loadDatabaseInfo();
		} catch (error) {
			console.error("Redis connection error:", error);
			setConnectionError(
				error instanceof Error ? error.message : "Failed to connect to Redis",
			);
			toast({
				title: "Connection Error",
				description:
					error instanceof Error ? error.message : "Failed to connect to Redis",
				variant: "destructive",
			});
		} finally {
			setIsConnecting(false);
		}
	};

	const loadKeys = async (pattern = searchPattern, cursor = "0") => {
		if (!activeConnectionId) return;

		setIsLoading(true);
		try {
			// Use the redis API
			const response = await window.redis.getKeys(
				activeConnectionId,
				pattern,
				cursor,
				100,
			);

			if (cursor === "0") {
				setKeys(response.keys);
			} else {
				setKeys((prev) => [...prev, ...response.keys]);
			}

			setScanCursor(response.cursor);
			setHasMoreKeys(response.cursor !== "0");
		} catch (error) {
			console.error("Failed to load Redis keys:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to load Redis keys",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const loadMoreKeys = () => {
		if (scanCursor !== "0") {
			loadKeys(searchPattern, scanCursor);
		}
	};

	const handleSearch = () => {
		// Reset cursor and search with new pattern
		setScanCursor("0");
		loadKeys(searchPattern, "0");
	};

	const loadServerInfo = async () => {
		if (!activeConnectionId) return;

		try {
			const info = await window.redis.getServerInfo(activeConnectionId);
			setServerInfo(info);
		} catch (error) {
			console.error("Failed to load Redis server info:", error);
		}
	};

	// Load command logs
	const loadCommandLogs = async () => {
		if (!activeConnectionId) return;

		setIsLoadingLogs(true);
		try {
			// This is a placeholder - you'll need to implement the getCommandLogs method in your Redis service
			// For now, we're using mock data for demonstration
			const mockLogs =
				(await window.redis.getCommandLogs?.(
					activeConnectionId,
					(currentPage - 1) * logsPerPage,
					logsPerPage,
				)) || getMockCommandLogs();

			setCommandLogs(mockLogs.logs || mockLogs);
			setTotalLogs(mockLogs.total || mockLogs.length);
		} catch (error) {
			console.error("Failed to load command logs:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to load command logs",
				variant: "destructive",
			});
		} finally {
			setIsLoadingLogs(false);
		}
	};

	// Generate mock command logs for demonstration
	const getMockCommandLogs = () => {
		const now = new Date();
		// Generate more mock logs for pagination demo
		const allLogs: CommandLog[] = Array.from({ length: 50 }, (_, i) => {
			const commands = [
				"FLUSHALL",
				"HGETALL bull:supportSession1HrReminderQueue:repeat:e48f1d52a5417c4a69c41dd44dc5da26:1741795140000",
				"eval -[[ Move stalled jobs to wait. Input: KEYS[1] 'stalled' (SET) KEYS[2] 'wait', (LIST) KEYS[3] 'active'...]]",
				"evalsha ef9feb35a83fa9a8c571510f20e2d57c75f68fd3 11 bull:refundQueue:wait bull:refundQueue:active bull:refundQueue:prioritized",
				"bzpopmin bull:testBookingReminder8HourQueue:marker 10",
				"XADD bull:supportSession1HrReminderQueue:events MAXLEN - 10000 * event delayed jobId repeat:e48f1d52a5417c4a69c41dd44dc5da26:1743819120000 delay 1743819120000",
				"ZRANGEBYSCORE bull:verifyPendingPaymentsCron30Minutes:delayed 0 7142678697713663 LIMIT 0 1000",
				"GET user:session:12345",
				"KEYS user:*",
				"SCAN 0 MATCH *Queue* COUNT 100",
			];

			return {
				timestamp: new Date(now.getTime() - i * 60000)
					.toISOString()
					.replace("T", " ")
					.substring(0, 19),
				duration: Math.random() * 1000,
				command: commands[i % commands.length],
			};
		});

		// For pagination, return only the requested logs plus total count
		const startIdx = (currentPage - 1) * logsPerPage;
		const endIdx = Math.min(startIdx + logsPerPage, allLogs.length);

		return {
			logs: allLogs.slice(startIdx, endIdx),
			total: allLogs.length,
		};
	};

	const selectKey = async (key: string) => {
		if (!activeConnectionId) return;

		setSelectedKey(key);
		setKeyInfo(null);
		setKeyValue(null);

		try {
			// Get key info using redis API
			const info = await window.redis.getKeyInfo(activeConnectionId, key);
			setKeyInfo(info);

			// Get key value using redis API
			const value = await window.redis.getKeyValue(activeConnectionId, key);
			setKeyValue(value);
		} catch (error) {
			console.error("Failed to get key details:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to get key details",
				variant: "destructive",
			});
		}
	};

	const deleteKey = async (key: string) => {
		if (!activeConnectionId) return;

		try {
			const success = await window.redis.deleteKey(activeConnectionId, key);

			if (success) {
				// Remove key from the list
				setKeys(keys.filter((k) => k !== key));

				// Reset selection if the deleted key was selected
				if (selectedKey === key) {
					setSelectedKey(null);
					setKeyInfo(null);
					setKeyValue(null);
				}

				toast({
					title: "Success",
					description: `Deleted key: ${key}`,
				});
			}
		} catch (error) {
			console.error("Failed to delete key:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to delete key",
				variant: "destructive",
			});
		}
	};

	const executeCommand = async () => {
		if (!activeConnectionId || !commandInput.trim()) return;

		try {
			// Parse the command
			const parts = commandInput.trim().split(/\s+/);
			const command = parts[0].toUpperCase();
			const args = parts.slice(1);

			const result = await window.redis.executeCommand(
				activeConnectionId,
				command,
				args,
			);

			setCommandResult(result);

			// Refresh keys if the command might have modified data
			if (
				["SET", "DEL", "EXPIRE", "RENAME", "FLUSHDB", "FLUSHALL"].includes(
					command,
				)
			) {
				loadKeys();
			}

			// Refresh command logs after executing a command
			loadCommandLogs();
		} catch (error) {
			console.error("Failed to execute command:", error);
			setCommandResult({
				error:
					error instanceof Error ? error.message : "Failed to execute command",
			});
		}
	};

	// Add a function to update a key's value
	const updateKeyValue = async (field: string, newValue: string) => {
		if (!activeConnectionId || !selectedKey) return;

		try {
			if (!keyValue) return;

			// For string type, use SET command directly
			if (keyValue.type.toLowerCase() === "string") {
				// Use executeCommand for direct Redis command execution
				await window.redis.executeCommand(activeConnectionId, "SET", [
					selectedKey,
					newValue,
				]);

				// Update local state
				setKeyValue({
					type: "string",
					value: newValue,
				});

				toast({
					title: "Value Updated",
					description: `Updated key ${selectedKey}`,
				});
			}
			// Handle hash field update using HSET command
			else if (keyValue.type.toLowerCase() === "hash") {
				// Use HSET command for hash fields
				await window.redis.executeCommand(activeConnectionId, "HSET", [
					selectedKey,
					field,
					newValue,
				]);

				// Update local state
				if (typeof keyValue.value === "object" && keyValue.value !== null) {
					const hashValue = { ...(keyValue.value as Record<string, unknown>) };
					hashValue[field] = newValue;

					setKeyValue({
						type: "hash",
						value: hashValue,
					});
				}

				toast({
					title: "Hash Field Updated",
					description: `Updated field ${field} of ${selectedKey}`,
				});
			}
		} catch (error) {
			console.error("Failed to update value:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to update value",
				variant: "destructive",
			});
		} finally {
			setEditingValue(null);
		}
	};

	// Function to save JSON from the editor
	const saveJsonValue = async () => {
		if (!activeConnectionId || !selectedKey || !editingJsonField) return;

		try {
			// Parse the JSON to validate it
			const parsedJson = JSON.parse(jsonEditorValue);
			const jsonString = JSON.stringify(parsedJson);

			if (keyValue?.type.toLowerCase() === "string") {
				// For string type, use SET command
				await window.redis.executeCommand(activeConnectionId, "SET", [
					selectedKey,
					jsonString,
				]);

				// Update local state
				setKeyValue({
					type: "string",
					value: jsonString,
				});
			} else if (keyValue?.type.toLowerCase() === "hash") {
				// For hash fields, use HSET command
				await window.redis.executeCommand(activeConnectionId, "HSET", [
					selectedKey,
					editingJsonField,
					jsonString,
				]);

				// Update local state
				if (typeof keyValue.value === "object" && keyValue.value !== null) {
					const hashValue = { ...(keyValue.value as Record<string, unknown>) };
					hashValue[editingJsonField] = jsonString;

					setKeyValue({
						type: "hash",
						value: hashValue,
					});
				}
			}
			// Add handling for list values using editingJsonField format "list:index"
			else if (
				keyValue?.type.toLowerCase() === "list" &&
				editingJsonField.startsWith("list:")
			) {
				const index = parseInt(editingJsonField.split(":")[1], 10);

				// Use LSET command for list items
				await window.redis.executeCommand(activeConnectionId, "LSET", [
					selectedKey,
					index.toString(),
					jsonString,
				]);

				// Refresh the key to get updated value
				await selectKey(selectedKey);
			}
			// Add handling for set values
			else if (
				keyValue?.type.toLowerCase() === "set" &&
				editingJsonField.startsWith("set:")
			) {
				const oldValue = editingJsonField.split(":")[1];

				// For sets, we need to remove the old value and add the new one
				// This is a transaction with MULTI/EXEC
				await window.redis.executeCommand(activeConnectionId, "SREM", [
					selectedKey,
					oldValue,
				]);

				await window.redis.executeCommand(activeConnectionId, "SADD", [
					selectedKey,
					jsonString,
				]);

				// Refresh the key to get updated value
				await selectKey(selectedKey);
			}

			toast({
				title: "JSON Updated",
				description: "Updated JSON value successfully",
			});

			// Close the dialog and reset
			setJsonDialogOpen(false);
			setEditingJsonField("");
		} catch (error) {
			console.error("Invalid JSON or failed to save:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Invalid JSON or failed to save",
				variant: "destructive",
			});
		}
	};

	// Function to edit JSON in Monaco editor
	const editJsonValue = (field: string, value: string) => {
		try {
			// Try to parse it as JSON to format it nicely
			const parsedJson = JSON.parse(value);
			setJsonEditorValue(JSON.stringify(parsedJson, null, 2));
		} catch {
			// If it's not valid JSON, just set the raw value
			setJsonEditorValue(value);
		}

		setEditingJsonField(field);
		setJsonDialogOpen(true);
	};

	// Helper function to determine if a string is valid JSON
	const isJsonString = (str: string) => {
		try {
			JSON.parse(str);
			return true;
		} catch (e) {
			return false;
		}
	};

	// Add fuzzy search capabilities for key-value data
	useEffect(() => {
		if (!keyValue || !searchQuery.trim()) {
			setFilteredKeyValue(null);
			return;
		}

		try {
			const { type, value } = keyValue;

			if (type === "string") {
				// For string values, just check if the string contains the query
				if (String(value).toLowerCase().includes(searchQuery.toLowerCase())) {
					setFilteredKeyValue(keyValue);
				} else {
					setFilteredKeyValue({ type, value: "" });
				}
				return;
			}

			if (type === "hash" && typeof value === "object" && value !== null) {
				// For hash values, search both keys and values
				const entries = Object.entries(value);
				const searcher = new FuzzySearch(entries, ["0", "1"], {
					caseSensitive: false,
				});
				const results = searcher.search(searchQuery);

				if (results.length > 0) {
					const filteredObject = Object.fromEntries(results);
					setFilteredKeyValue({ type, value: filteredObject });
				} else {
					setFilteredKeyValue({ type, value: {} });
				}
				return;
			}

			if (type === "list" && Array.isArray(value)) {
				// For list values, search the items
				const searcher = new FuzzySearch(
					value.map((item, index) => ({ index, value: String(item) })),
					["value"],
					{ caseSensitive: false },
				);
				const results = searcher.search(searchQuery);

				if (results.length > 0) {
					// Maintain original indices
					setFilteredKeyValue({
						type,
						value: results.map((r: { index: number }) => value[r.index]),
					});
				} else {
					setFilteredKeyValue({ type, value: [] });
				}
				return;
			}

			if (type === "set" && Array.isArray(value)) {
				// For set values, search the items
				const searcher = new FuzzySearch(
					value.map((item) => String(item)),
					[],
					{ caseSensitive: false },
				);
				const results = searcher.search(searchQuery);

				if (results.length > 0) {
					setFilteredKeyValue({ type, value: results });
				} else {
					setFilteredKeyValue({ type, value: [] });
				}
				return;
			}

			// Default case: no filtering
			setFilteredKeyValue(null);
		} catch (error) {
			console.error("Error in fuzzy search:", error);
			setFilteredKeyValue(null);
		}
	}, [keyValue, searchQuery]);

	// Create debounced search handler
	const debouncedSearchHandler = useCallback(
		debounce((value: string) => {
			setSearchQuery(value);
		}, 300),
		[],
	);

	// Handle search input change
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		debouncedSearchHandler(e.target.value);
	};

	// Helper function to render different data types
	const renderKeyValue = () => {
		if (!keyValue) return null;

		const displayValue = filteredKeyValue || keyValue;
		const { type, value } = displayValue;
		const isFiltered = filteredKeyValue !== null;

		switch (type.toLowerCase()) {
			case "string": {
				// Detect if it's JSON and format it
				const stringValue = String(value);
				const isJson =
					isJsonString(stringValue) &&
					(stringValue.startsWith("{") || stringValue.startsWith("["));

				if (isJson) {
					try {
						const jsonValue = JSON.parse(stringValue);
						const jsonPreview =
							JSON.stringify(jsonValue).substring(0, 100) +
							(JSON.stringify(jsonValue).length > 100 ? "..." : "");

						return (
							<div className="p-4 bg-muted rounded-md">
								<div className="flex justify-between items-start mb-2">
									<div className="font-medium">JSON Value</div>
									<div className="flex space-x-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => editJsonValue("", stringValue)}
										>
											<Edit className="h-3 w-3 mr-1" />
											Edit JSON
										</Button>
									</div>
								</div>
								<div className="bg-background p-2 rounded border font-mono text-sm overflow-hidden">
									{jsonPreview}
								</div>
							</div>
						);
					} catch {
						// Not valid JSON, continue with normal string display
					}
				}

				return (
					<div className="p-4 bg-muted rounded-md">
						{editingValue && editingValue.field === "" ? (
							<div className="flex items-center gap-2">
								<Input
									value={editingValue.value}
									onChange={(e) =>
										setEditingValue({ ...editingValue, value: e.target.value })
									}
									autoFocus
									className="flex-1 font-mono"
								/>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => updateKeyValue("", editingValue.value)}
								>
									<Check className="h-4 w-4 text-green-500" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setEditingValue(null)}
								>
									<X className="h-4 w-4 text-red-500" />
								</Button>
							</div>
						) : (
							<div className="flex justify-between items-start">
								<div className="overflow-auto max-h-96">{stringValue}</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() =>
										setEditingValue({ field: "", value: stringValue })
									}
								>
									<Edit className="h-4 w-4" />
								</Button>
							</div>
						)}
					</div>
				);
			}

			case "list": {
				if (!Array.isArray(value)) return <div>Invalid list value</div>;

				return (
					<div className="bg-muted rounded-md overflow-hidden">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="px-4 py-2 text-left w-1/6">Index</th>
									<th className="px-4 py-2 text-left w-5/6">Value</th>
								</tr>
							</thead>
							<tbody>
								{value.map((item, index) => (
									<tr
										key={`list-item-${index}`}
										className="border-b border-border"
									>
										<td className="px-4 py-2">{index}</td>
										<td className="px-4 py-2 font-mono">
											<div className="flex items-center justify-between">
												<span className="truncate max-w-md">
													{String(item)}
												</span>
												{isJsonString(String(item)) && (
													<Button
														variant="ghost"
														size="sm"
														className="ml-2"
														onClick={() =>
															editJsonValue(`list:${index}`, String(item))
														}
													>
														<Edit className="h-3 w-3" />
													</Button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				);
			}

			case "set": {
				if (!Array.isArray(value)) return <div>Invalid set value</div>;

				return (
					<div className="bg-muted rounded-md overflow-hidden">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="px-4 py-2 text-left">Member</th>
								</tr>
							</thead>
							<tbody>
								{value.map((item, index) => (
									<tr
										key={`set-member-${index}`}
										className="border-b border-border"
									>
										<td className="px-4 py-2 font-mono">
											<div className="flex items-center justify-between">
												<span className="truncate max-w-md">
													{String(item)}
												</span>
												{isJsonString(String(item)) && (
													<Button
														variant="ghost"
														size="sm"
														className="ml-2"
														onClick={() =>
															editJsonValue(`set:${index}`, String(item))
														}
													>
														<Edit className="h-3 w-3" />
													</Button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				);
			}

			case "hash": {
				if (typeof value !== "object" || value === null)
					return <div>Invalid hash value</div>;

				return (
					<div className="bg-muted rounded-md overflow-hidden">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="px-4 py-2 text-left w-1/3">Field</th>
									<th className="px-4 py-2 text-left w-2/3">Value</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(value).map(([field, val]) => (
									<tr
										key={`hash-field-${field}`}
										className="border-b border-border"
									>
										<td className="px-4 py-2">
											{editingFieldName &&
											editingFieldName.oldField === field ? (
												<div className="flex items-center gap-2">
													<Input
														value={editingFieldName.newField}
														onChange={(e) =>
															setEditingFieldName({
																...editingFieldName,
																newField: e.target.value,
															})
														}
														autoFocus
														className="flex-1 font-mono"
													/>
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															renameHashField(field, editingFieldName.newField)
														}
													>
														<Check className="h-4 w-4 text-green-500" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setEditingFieldName(null)}
													>
														<X className="h-4 w-4 text-red-500" />
													</Button>
												</div>
											) : (
												<div className="flex items-center justify-between">
													<span className="truncate max-w-md">{field}</span>
													<Button
														variant="ghost"
														size="sm"
														className="ml-2"
														onClick={() =>
															setEditingFieldName({
																oldField: field,
																newField: field,
															})
														}
													>
														<Edit className="h-3 w-3" />
													</Button>
												</div>
											)}
										</td>
										<td className="px-4 py-2 font-mono">
											{editingValue && editingValue.field === field ? (
												<div className="flex items-center gap-2">
													<Input
														value={editingValue.value}
														onChange={(e) =>
															setEditingValue({
																...editingValue,
																value: e.target.value,
															})
														}
														autoFocus
														className="flex-1 font-mono"
													/>
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															updateKeyValue(field, editingValue.value)
														}
													>
														<Check className="h-4 w-4 text-green-500" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setEditingValue(null)}
													>
														<X className="h-4 w-4 text-red-500" />
													</Button>
												</div>
											) : (
												<div className="flex items-center justify-between">
													<span className="truncate max-w-md">
														{String(val)}
													</span>
													<div className="flex">
														<Button
															variant="ghost"
															size="sm"
															className="ml-2"
															onClick={() =>
																setEditingValue({ field, value: String(val) })
															}
														>
															<Edit className="h-3 w-3" />
														</Button>
														{typeof val === "string" && isJsonString(val) && (
															<Button
																variant="ghost"
																size="sm"
																className="ml-1"
																onClick={() =>
																	editJsonValue(field, String(val))
																}
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	width="24"
																	height="24"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="2"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	className="h-3 w-3"
																	aria-hidden="true"
																>
																	<path d="M16 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
																	<path d="M12 20v-8" />
																	<path d="M9 9h6" />
																</svg>
															</Button>
														)}
													</div>
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				);
			}

			case "zset": {
				if (typeof value !== "object" || value === null)
					return <div>Invalid zset value</div>;

				return (
					<div className="bg-muted rounded-md overflow-hidden">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="px-4 py-2 text-left">Member</th>
									<th className="px-4 py-2 text-left">Score</th>
									<th className="px-4 py-2 text-left w-16">Actions</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(value).map(([member, score]) => (
									<tr
										key={`zset-member-${member}`}
										className="border-b border-border"
									>
										<td className="px-4 py-2">{member}</td>
										<td className="px-4 py-2">{String(score)}</td>
										<td className="px-4 py-2">
											{isJsonString(member) && (
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6"
													onClick={() =>
														editJsonValue(`zset:${member}`, member)
													}
												>
													<Edit className="h-3 w-3" />
												</Button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				);
			}

			default:
				return (
					<div className="p-4 bg-muted rounded-md">
						Unsupported data type: {type}
					</div>
				);
		}
	};

	// Render key TTL as a human-readable string
	const renderTTL = (ttl: number) => {
		if (ttl === -1) return "No expiration";
		if (ttl === -2) return "Expired";

		if (ttl < 60) return `${ttl} seconds`;
		if (ttl < 3600) return `${Math.floor(ttl / 60)} minutes`;
		if (ttl < 86400) return `${Math.floor(ttl / 3600)} hours`;
		return `${Math.floor(ttl / 86400)} days`;
	};

	// Format memory size
	const formatSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	// Format duration in milliseconds to a readable string
	const formatDuration = (ms: number) => {
		if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`;
		if (ms < 1000) return `${ms.toFixed(3)} ms`;
		return `${(ms / 1000).toFixed(2)} s`;
	};

	// Render server info in the monitoring tab
	const renderServerInfo = () => {
		if (!serverInfo) return <div>Loading server information...</div>;

		// Focus on most important metrics
		const memory = serverInfo?.memory || {};
		const stats = serverInfo?.stats || {};
		const server = serverInfo?.server || {};
		const cpu = serverInfo?.cpu || {};

		return (
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Memory</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-2 gap-2">
							<dt className="text-muted-foreground">Used Memory:</dt>
							<dd>{formatSize(Number.parseInt(memory.used_memory || "0"))}</dd>

							<dt className="text-muted-foreground">Peak Memory:</dt>
							<dd>
								{formatSize(Number.parseInt(memory.used_memory_peak || "0"))}
							</dd>

							<dt className="text-muted-foreground">Fragmentation Ratio:</dt>
							<dd>{memory.mem_fragmentation_ratio || "N/A"}</dd>
						</dl>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Server</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-2 gap-2">
							<dt className="text-muted-foreground">Redis Version:</dt>
							<dd>{server.redis_version || "N/A"}</dd>

							<dt className="text-muted-foreground">Uptime:</dt>
							<dd>
								{(
									Number.parseInt(server.uptime_in_seconds || "0") / 86400
								).toFixed(1)}{" "}
								days
							</dd>

							<dt className="text-muted-foreground">Connected Clients:</dt>
							<dd>{stats.connected_clients || "0"}</dd>

							<dt className="text-muted-foreground">CPU Usage:</dt>
							<dd>{cpu.used_cpu_sys || "N/A"}</dd>
						</dl>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Statistics</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-2 gap-2">
							<dt className="text-muted-foreground">Total Commands:</dt>
							<dd>{stats.total_commands_processed || "0"}</dd>

							<dt className="text-muted-foreground">Total Connections:</dt>
							<dd>{stats.total_connections_received || "0"}</dd>

							<dt className="text-muted-foreground">Keyspace Hits:</dt>
							<dd>{stats.keyspace_hits || "0"}</dd>

							<dt className="text-muted-foreground">Keyspace Misses:</dt>
							<dd>{stats.keyspace_misses || "0"}</dd>
						</dl>
					</CardContent>
				</Card>
			</div>
		);
	};

	// Get database count and current database
	const loadDatabaseInfo = async () => {
		if (!activeConnectionId) return;

		setIsDatabaseLoading(true);
		try {
			// Get the database count
			const countResult =
				await window.redis.getDatabaseCount(activeConnectionId);
			if (countResult.success) {
				setDatabaseCount(countResult.count);
			} else {
				setDatabaseCount(16); // Default to 16 if not available
			}

			// Get the current database
			const currentDbResult =
				await window.redis.getCurrentDatabase(activeConnectionId);
			if (currentDbResult.success) {
				setCurrentDatabase(currentDbResult.db);
			} else {
				setCurrentDatabase(0); // Default to db0 if not available
			}

			// Get the populated databases
			const populatedDbsResult =
				await window.redis.getPopulatedDatabases(activeConnectionId);
			if (populatedDbsResult.success) {
				setAvailableDatabases(populatedDbsResult.databases);
			} else {
				// Default to showing just the current database
				setAvailableDatabases([
					currentDbResult.success ? currentDbResult.db : 0,
				]);
			}
		} catch (error) {
			console.error("Failed to get database info:", error);
			toast({
				title: "Warning",
				description: "Failed to get database information. Using defaults.",
				variant: "default",
			});
		} finally {
			setIsDatabaseLoading(false);
		}
	};

	// Handle database selection change
	const handleDatabaseChange = async (dbNumber: number) => {
		if (!activeConnectionId || dbNumber === currentDatabase) return;

		setIsDatabaseLoading(true);
		try {
			const result = await window.redis.selectDatabase(
				activeConnectionId,
				dbNumber,
			);
			if (result.success) {
				setCurrentDatabase(dbNumber);
				// Reload keys and reset state
				setSelectedKey(null);
				setKeyInfo(null);
				setKeyValue(null);
				setScanCursor("0");
				await loadKeys("*", "0");

				// Refresh the list of available databases after switching
				const populatedDbsResult =
					await window.redis.getPopulatedDatabases(activeConnectionId);
				if (populatedDbsResult.success) {
					setAvailableDatabases(populatedDbsResult.databases);
				}

				toast({
					title: "Database Changed",
					description: `Switched to database ${dbNumber}`,
				});
			} else {
				throw new Error(result.message);
			}
		} catch (error) {
			console.error("Failed to change database:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to change database",
				variant: "destructive",
			});
		} finally {
			setIsDatabaseLoading(false);
		}
	};

	useEffect(() => {
		if (activeTab === "command-logs") {
			loadCommandLogs();
		}
	}, [activeTab, currentPage, logsPerPage]);

	// Handle page change
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	// Handle logs per page change
	const handleLogsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setLogsPerPage(Number(e.target.value));
		setCurrentPage(1); // Reset to first page when changing items per page
	};

	// Calculate total pages
	const totalPages = Math.ceil(totalLogs / logsPerPage);

	// Generate page numbers array for pagination
	const getPageNumbers = () => {
		const pageNumbers = [];
		const maxPagesToShow = 5;

		if (totalPages <= maxPagesToShow) {
			// Show all pages if there are fewer than maxPagesToShow
			for (let i = 1; i <= totalPages; i++) {
				pageNumbers.push(i);
			}
		} else {
			// Always show first page
			pageNumbers.push(1);

			// Calculate start and end of the sliding window
			let start = Math.max(2, currentPage - 1);
			let end = Math.min(start + maxPagesToShow - 3, totalPages - 1);

			// Adjust start if end is at max
			if (end === totalPages - 1) {
				start = Math.max(2, end - (maxPagesToShow - 3));
			}

			// Add ellipsis after first page if needed
			if (start > 2) {
				pageNumbers.push("...");
			}

			// Add pages in the sliding window
			for (let i = start; i <= end; i++) {
				pageNumbers.push(i);
			}

			// Add ellipsis before last page if needed
			if (end < totalPages - 1) {
				pageNumbers.push("...");
			}

			// Always show last page
			pageNumbers.push(totalPages);
		}

		return pageNumbers;
	};

	// Add a rename key function
	const renameKey = async (oldKey: string, newKey: string) => {
		if (!activeConnectionId || !oldKey || !newKey) return;

		try {
			// Use the RENAME command via executeCommand
			await window.redis.executeCommand(activeConnectionId, "RENAME", [
				oldKey,
				newKey,
			]);

			// Update the keys list
			setKeys((prev) => prev.map((k) => (k === oldKey ? newKey : k)));

			// Update selected key if it was the renamed one
			if (selectedKey === oldKey) {
				setSelectedKey(newKey);
				// Refresh key info and value
				selectKey(newKey);
			}

			toast({
				title: "Key Renamed",
				description: `Renamed "${oldKey}" to "${newKey}"`,
			});
		} catch (error) {
			console.error("Failed to rename key:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to rename key",
				variant: "destructive",
			});
		}
	};

	// Handle the rename action
	const handleRename = (key: string) => {
		setKeyBeingRenamed(key);
		setNewKeyName(key);
	};

	// Handle submit rename
	const handleSubmitRename = (e: React.FormEvent) => {
		e.preventDefault();
		if (keyBeingRenamed && newKeyName && keyBeingRenamed !== newKeyName) {
			renameKey(keyBeingRenamed, newKeyName);
		}
		setKeyBeingRenamed(null);
	};

	// Handle cancel rename
	const handleCancelRename = () => {
		setKeyBeingRenamed(null);
	};

	// Add function to rename a hash field
	const renameHashField = async (oldField: string, newField: string) => {
		if (
			!activeConnectionId ||
			!selectedKey ||
			!keyValue ||
			keyValue.type.toLowerCase() !== "hash"
		)
			return;

		try {
			if (oldField === newField) {
				setEditingFieldName(null);
				return;
			}

			// Get the current value of the field
			const hashValue = keyValue.value as Record<string, unknown>;
			const currentValue = hashValue[oldField];

			if (currentValue === undefined) {
				throw new Error(`Field ${oldField} not found`);
			}

			// Check if new field already exists
			if (hashValue[newField] !== undefined) {
				throw new Error(`Field ${newField} already exists`);
			}

			// Execute a multi-step operation: delete old field, set new field
			await window.redis.executeCommand(activeConnectionId, "HDEL", [
				selectedKey,
				oldField,
			]);

			await window.redis.executeCommand(activeConnectionId, "HSET", [
				selectedKey,
				newField,
				String(currentValue),
			]);

			// Update local state
			const updatedHashValue = { ...hashValue };
			delete updatedHashValue[oldField];
			updatedHashValue[newField] = currentValue;

			setKeyValue({
				type: "hash",
				value: updatedHashValue,
			});

			toast({
				title: "Field Renamed",
				description: `Renamed field "${oldField}" to "${newField}"`,
			});
		} catch (error) {
			console.error("Failed to rename hash field:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to rename hash field",
				variant: "destructive",
			});
		} finally {
			setEditingFieldName(null);
		}
	};

	return (
		<Layout title={`Redis - ${activeConnectionName || "Connection"}`}>
			{connectionError ? (
				<div className="flex-1 flex items-center justify-center p-4">
					<div className="max-w-md w-full">
						<div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
							<h3 className="font-medium mb-2">Connection Error</h3>
							<p>{connectionError}</p>
						</div>
						<Button onClick={initiateRedisConnection} disabled={isConnecting}>
							{isConnecting ? "Connecting..." : "Retry Connection"}
						</Button>
					</div>
				</div>
			) : isConnecting ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="flex flex-col items-center gap-4">
						<div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						<p>Connecting to Redis...</p>
					</div>
				</div>
			) : (
				<div className="flex-1 flex flex-col h-full">
					<Tabs
						defaultValue={activeTab}
						value={activeTab}
						onValueChange={setActiveTab}
						className="flex-1 flex flex-col"
					>
						<div className="flex justify-between items-center px-4 py-2 border-b">
							<TabsList>
								<TabsTrigger value="browser">
									<Database className="h-4 w-4 mr-2" />
									Browser
								</TabsTrigger>
								<TabsTrigger value="terminal">
									<Terminal className="h-4 w-4 mr-2" />
									CLI
								</TabsTrigger>
								<TabsTrigger value="command-logs">
									<Clock className="h-4 w-4 mr-2" />
									Command Logs
								</TabsTrigger>
							</TabsList>

							{/* Database Selector */}
							<div className="flex items-center space-x-2">
								<label htmlFor="database-select" className="text-sm">
									Database:
								</label>
								<select
									id="database-select"
									className="h-9 px-3 py-1 rounded-md border border-input bg-background text-sm"
									value={currentDatabase}
									onChange={(e) => handleDatabaseChange(Number(e.target.value))}
									disabled={isDatabaseLoading}
								>
									{availableDatabases.map((dbNum) => (
										<option key={`db-${dbNum}`} value={dbNum}>
											{dbNum} {dbNum === currentDatabase ? "(current)" : ""}
										</option>
									))}
								</select>
								{isDatabaseLoading && (
									<div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
								)}
							</div>
						</div>

						<TabsContent value="browser" className="flex-1 flex flex-col p-0">
							<div className="flex-1 flex overflow-hidden">
								{/* Keys list */}
								<div className="w-1/3 flex flex-col border-r">
									<div className="p-4 border-b">
										<div className="flex gap-2">
											<div className="flex-1 relative">
												<Input
													value={searchPattern}
													onChange={(e) => setSearchPattern(e.target.value)}
													placeholder="Search keys (e.g., user:*)"
													className="pr-8"
													onKeyDown={(e) => e.key === "Enter" && handleSearch()}
												/>
												<Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
											</div>
											<Button
												variant="outline"
												size="icon"
												onClick={handleSearch}
											>
												<Search className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												onClick={() => loadKeys("*", "0")}
											>
												<RefreshCw className="h-4 w-4" />
											</Button>
										</div>
									</div>

									<div
										className="flex-1 overflow-auto"
										style={{ maxHeight: "calc(100vh - 210px)" }}
									>
										{isLoading && keys.length === 0 ? (
											<div className="flex items-center justify-center h-full">
												<div className="flex flex-col items-center">
													<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
													<p className="mt-2 text-sm text-muted-foreground">
														Loading keys...
													</p>
												</div>
											</div>
										) : keys.length === 0 ? (
											<div className="flex items-center justify-center h-full">
												<p className="text-muted-foreground">No keys found</p>
											</div>
										) : (
											<div className="divide-y">
												{keys.map((key) => (
													<div
														key={key}
														className={`group flex justify-between items-center px-4 py-2 hover:bg-muted cursor-pointer ${selectedKey === key ? "bg-muted" : ""}`}
													>
														{keyBeingRenamed === key ? (
															<form
																onSubmit={handleSubmitRename}
																className="flex-1 flex items-center gap-2"
															>
																<Input
																	value={newKeyName}
																	onChange={(e) =>
																		setNewKeyName(e.target.value)
																	}
																	autoFocus
																	className="flex-1"
																/>
																<Button
																	type="submit"
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8"
																>
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="2"
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		className="h-4 w-4 text-green-500"
																	>
																		<polyline points="20 6 9 17 4 12"></polyline>
																	</svg>
																</Button>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8"
																	onClick={handleCancelRename}
																>
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="2"
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		className="h-4 w-4 text-red-500"
																	>
																		<line x1="18" y1="6" x2="6" y2="18"></line>
																		<line x1="6" y1="6" x2="18" y2="18"></line>
																	</svg>
																</Button>
															</form>
														) : (
															<>
																<div
																	className="truncate flex-1"
																	onClick={() => selectKey(key)}
																>
																	{key}
																</div>
																<div className="flex opacity-0 group-hover:opacity-100">
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 text-muted-foreground hover:text-blue-500"
																		onClick={(e) => {
																			e.stopPropagation();
																			handleRename(key);
																		}}
																	>
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 24 24"
																			fill="none"
																			stroke="currentColor"
																			strokeWidth="2"
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			className="h-4 w-4"
																		>
																			<path d="M12 20h9"></path>
																			<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
																		</svg>
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 text-muted-foreground hover:text-destructive"
																		onClick={(e) => {
																			e.stopPropagation();
																			deleteKey(key);
																		}}
																	>
																		<Trash className="h-4 w-4" />
																	</Button>
																</div>
															</>
														)}
													</div>
												))}

												{hasMoreKeys && (
													<div className="p-4 flex justify-center">
														<Button
															variant="outline"
															onClick={loadMoreKeys}
															disabled={isLoading}
														>
															{isLoading ? "Loading..." : "Load more"}
														</Button>
													</div>
												)}
											</div>
										)}
									</div>
								</div>

								{/* Key details */}
								<div className="flex-1 flex flex-col overflow-hidden">
									{!selectedKey ? (
										<div className="flex items-center justify-center h-full text-muted-foreground">
											Select a key to view its details
										</div>
									) : (
										<>
											<div className="p-4 border-b">
												<div className="flex items-center justify-between">
													<h2 className="text-lg font-medium truncate">
														{selectedKey}
													</h2>
													<div className="flex items-center gap-2">
														{keyInfo && (
															<>
																<Badge variant="outline">{keyInfo.type}</Badge>
																<Badge variant="outline">
																	{renderTTL(keyInfo.ttl)}
																</Badge>
																<Badge variant="outline">
																	{formatSize(keyInfo.size)}
																</Badge>
															</>
														)}
														<Button
															variant="ghost"
															size="icon"
															className="text-muted-foreground hover:text-destructive"
															onClick={() =>
																selectedKey && deleteKey(selectedKey)
															}
														>
															<Trash className="h-4 w-4" />
														</Button>
													</div>
												</div>
											</div>

											<div className="flex-1 p-4 overflow-auto">
												{keyValue ? (
													<>
														{/* Search box */}
														<div className="mb-4 flex justify-end">
															<div className="relative w-60">
																<Input
																	type="text"
																	placeholder="Search fields and values..."
																	className="pr-8"
																	onChange={handleSearchChange}
																/>
																<div className="absolute right-2 top-2.5 text-muted-foreground">
																	<Search
																		className="h-4 w-4"
																		aria-hidden="true"
																	/>
																</div>
															</div>
														</div>

														{/* Render key value */}
														{renderKeyValue()}
													</>
												) : (
													<div className="flex items-center justify-center h-full">
														<p className="text-muted-foreground">
															Select a key to view its value
														</p>
													</div>
												)}
											</div>
										</>
									)}
								</div>
							</div>
						</TabsContent>

						<TabsContent
							value="terminal"
							className="flex-1 flex flex-col p-4 space-y-4"
						>
							<Card className="flex-1 flex flex-col">
								<CardHeader>
									<CardTitle>Redis CLI</CardTitle>
								</CardHeader>
								<CardContent className="flex-1 flex flex-col">
									<div className="flex-1 overflow-auto mb-4 font-mono bg-muted rounded-md p-4">
										{commandResult ? (
											typeof commandResult === "object" ? (
												<pre>{JSON.stringify(commandResult, null, 2)}</pre>
											) : Array.isArray(commandResult) ? (
												<ol className="list-decimal pl-5">
													{commandResult.map((item, index) => (
														<li key={`result-${item}-${index}`}>
															{String(item)}
														</li>
													))}
												</ol>
											) : (
												<div>{String(commandResult)}</div>
											)
										) : (
											<div className="text-muted-foreground">
												Enter a Redis command below (e.g. GET key, SET key
												value, KEYS pattern)
											</div>
										)}
									</div>

									<div className="flex gap-2">
										<Input
											value={commandInput}
											onChange={(e) => setCommandInput(e.target.value)}
											placeholder="Enter command (e.g., GET mykey)"
											onKeyDown={(e) => e.key === "Enter" && executeCommand()}
										/>
										<Button onClick={executeCommand}>Execute</Button>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent
							value="command-logs"
							className="flex-1 p-4 overflow-auto"
						>
							<div className="mb-4 flex justify-between items-center">
								<h2 className="text-lg font-medium">Command Logs</h2>
								<Button variant="outline" size="sm" onClick={loadCommandLogs}>
									<RefreshCw className="h-4 w-4 mr-2" />
									Refresh
								</Button>
							</div>

							{isLoadingLogs ? (
								<div className="flex items-center justify-center py-8">
									<div className="flex flex-col items-center">
										<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
										<p className="mt-2 text-sm text-muted-foreground">
											Loading command logs...
										</p>
									</div>
								</div>
							) : (
								<>
									<div className="rounded-md border overflow-hidden">
										<table className="w-full">
											<thead>
												<tr className="border-b bg-muted/50">
													<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
														Timestamp
													</th>
													<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
														Duration, msec
													</th>
													<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
														Command
													</th>
												</tr>
											</thead>
											<tbody>
												{commandLogs.length === 0 ? (
													<tr>
														<td
															colSpan={3}
															className="px-4 py-8 text-center text-muted-foreground"
														>
															No command logs available
														</td>
													</tr>
												) : (
													commandLogs.map((log, index) => (
														<tr
															key={`cmd-${log.timestamp}-${index}`}
															className={
																index % 2 === 0
																	? "bg-background"
																	: "bg-muted/20"
															}
														>
															<td className="px-4 py-3 text-sm">
																{log.timestamp}
															</td>
															<td className="px-4 py-3 text-sm">
																{formatDuration(log.duration)}
															</td>
															<td className="px-4 py-3 text-sm font-mono whitespace-pre-wrap break-all">
																{log.command}
															</td>
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>

									{totalLogs > 0 && (
										<div className="flex items-center justify-between mt-4">
											<div className="flex items-center gap-2">
												<span className="text-sm text-muted-foreground">
													Show
												</span>
												<select
													className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
													value={logsPerPage}
													onChange={handleLogsPerPageChange}
												>
													<option value={10}>10</option>
													<option value={25}>25</option>
													<option value={50}>50</option>
													<option value={100}>100</option>
												</select>
												<span className="text-sm text-muted-foreground">
													entries
												</span>
											</div>

											<div className="flex items-center gap-1">
												<Button
													variant="outline"
													size="sm"
													onClick={() => handlePageChange(1)}
													disabled={currentPage === 1 || isLoadingLogs}
												>
													First
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handlePageChange(currentPage - 1)}
													disabled={currentPage === 1 || isLoadingLogs}
												>
													Previous
												</Button>

												{getPageNumbers().map((page, index) =>
													typeof page === "number" ? (
														<Button
															key={`page-${page}`}
															variant={
																currentPage === page ? "default" : "outline"
															}
															size="sm"
															onClick={() => handlePageChange(page)}
															disabled={isLoadingLogs}
														>
															{page}
														</Button>
													) : (
														<span key={`ellipsis-${index}`} className="px-2">
															...
														</span>
													),
												)}

												<Button
													variant="outline"
													size="sm"
													onClick={() => handlePageChange(currentPage + 1)}
													disabled={currentPage === totalPages || isLoadingLogs}
												>
													Next
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handlePageChange(totalPages)}
													disabled={currentPage === totalPages || isLoadingLogs}
												>
													Last
												</Button>
											</div>

											<div className="text-sm text-muted-foreground">
												Showing {(currentPage - 1) * logsPerPage + 1} to{" "}
												{Math.min(currentPage * logsPerPage, totalLogs)} of{" "}
												{totalLogs} entries
											</div>
										</div>
									)}
								</>
							)}
						</TabsContent>
					</Tabs>
				</div>
			)}

			{/* Add JSON Editor Modal */}
			<Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
				<DialogContent className="sm:max-w-[800px] max-h-[80vh]">
					<DialogHeader>
						<DialogTitle>Edit JSON Value</DialogTitle>
					</DialogHeader>
					<div className="h-[500px] border rounded-md overflow-hidden">
						<Editor
							height="100%"
							language="json"
							value={jsonEditorValue}
							onChange={(value) =>
								value !== undefined && setJsonEditorValue(value)
							}
							options={{
								minimap: { enabled: false },
								scrollBeyondLastLine: false,
								automaticLayout: true,
								formatOnPaste: true,
								formatOnType: true,
							}}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setJsonDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={saveJsonValue}>Save Changes</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Layout>
	);
}

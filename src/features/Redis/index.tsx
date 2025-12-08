import { useEffect, useState, useCallback } from "react";
import { useScreen } from "@/context/ScreenContext";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useRedisConnection,
	useRedisKeys,
	useRedisValue,
	useRedisCommands,
	useRedisDatabase,
} from "./hooks";
import {
	KeyList,
	KeyValueEditor,
	CommandConsole,
	ServerMonitor,
	DatabaseSelector,
	JsonEditorDialog,
	ConnectionStatus,
} from "./components";

/**
 * Main Redis feature component - composes all hooks and components
 */
export function RedisScreen() {
	const { activeConnectionId, activeConnectionName } = useScreen();
	const [activeTab, setActiveTab] = useState("browser");

	// JSON editor state
	const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
	const [jsonEditorValue, setJsonEditorValue] = useState("");
	const [editingJsonField, setEditingJsonField] = useState("");

	// Connection hook
	const {
		isConnecting,
		connectionError,
		serverInfo,
		connect,
		loadServerInfo,
	} = useRedisConnection({ connectionId: activeConnectionId });

	// Keys hook
	const {
		keys,
		isLoading: isLoadingKeys,
		searchPattern,
		hasMoreKeys,
		selectedKey,
		keyInfo,
		keyValue,
		setSearchPattern,
		loadKeys,
		loadMoreKeys,
		selectKey,
		deleteKey,
		refreshKeys,
	} = useRedisKeys({ connectionId: activeConnectionId });

	// Value editing hook
	const {
		editingField,
		editingValue,
		startEditing,
		cancelEditing,
		saveValue,
		setEditingValue,
	} = useRedisValue({
		connectionId: activeConnectionId,
		selectedKey,
		keyValue,
		onKeyValueUpdate: () => {
			// Refresh key after update
			if (selectedKey) selectKey(selectedKey);
		},
	});

	// Commands hook
	const {
		commandInput,
		commandResult,
		isExecuting,
		setCommandInput,
		executeCommand,
	} = useRedisCommands({
		connectionId: activeConnectionId,
		onDataChange: refreshKeys,
	});

	// Database hook
	const {
		currentDatabase,
		databaseCount,
		availableDatabases,
		isLoading: isDatabaseLoading,
		loadDatabaseInfo,
		selectDatabase,
	} = useRedisDatabase({
		connectionId: activeConnectionId,
		onDatabaseChange: refreshKeys,
	});

	// Initialize connection on mount
	useEffect(() => {
		const initConnection = async () => {
			const success = await connect();
			if (success) {
				await Promise.all([loadKeys(), loadServerInfo(), loadDatabaseInfo()]);
			}
		};

		if (activeConnectionId) {
			initConnection();
		}
	}, [activeConnectionId, connect, loadKeys, loadServerInfo, loadDatabaseInfo]);

	// Handle JSON editing
	const handleEditJson = useCallback((field: string, value: string) => {
		try {
			const parsed = JSON.parse(value);
			setJsonEditorValue(JSON.stringify(parsed, null, 2));
		} catch {
			setJsonEditorValue(value);
		}
		setEditingJsonField(field);
		setJsonDialogOpen(true);
	}, []);

	const handleSaveJson = useCallback(async () => {
		if (!activeConnectionId || !selectedKey) return;

		try {
			const parsedJson = JSON.parse(jsonEditorValue);
			const jsonString = JSON.stringify(parsedJson);

			if (keyValue?.type.toLowerCase() === "string") {
				await window.redis.executeCommand(activeConnectionId, "SET", [
					selectedKey,
					jsonString,
				]);
			} else if (keyValue?.type.toLowerCase() === "hash" && editingJsonField) {
				await window.redis.executeCommand(activeConnectionId, "HSET", [
					selectedKey,
					editingJsonField,
					jsonString,
				]);
			}

			// Refresh the key value
			await selectKey(selectedKey);
			setJsonDialogOpen(false);
		} catch (error) {
			console.error("Failed to save JSON:", error);
		}
	}, [
		activeConnectionId,
		selectedKey,
		keyValue,
		jsonEditorValue,
		editingJsonField,
		selectKey,
	]);

	// Show connection status if not connected
	if (isConnecting || connectionError) {
		return (
			<Layout title={activeConnectionName || "Redis"}>
				<ConnectionStatus
					isConnecting={isConnecting}
					connectionError={connectionError}
					connectionName={activeConnectionName || "Redis"}
					onRetry={connect}
				/>
			</Layout>
		);
	}

	return (
		<Layout title={activeConnectionName || "Redis"}>
			<div className="h-full flex flex-col">
				{/* Header with database selector */}
				<div className="flex items-center justify-between p-4 border-b">
					<DatabaseSelector
						currentDatabase={currentDatabase}
						databaseCount={databaseCount}
						availableDatabases={availableDatabases}
						isLoading={isDatabaseLoading}
						onDatabaseChange={selectDatabase}
					/>
				</div>

				{/* Main content with tabs */}
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="flex-1 flex flex-col"
				>
					<div className="px-4 border-b">
						<TabsList>
							<TabsTrigger value="browser">Key Browser</TabsTrigger>
							<TabsTrigger value="cli">CLI</TabsTrigger>
							<TabsTrigger value="monitor">Server Info</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent
						value="browser"
						className="flex-1 flex mt-0 data-[state=inactive]:hidden"
					>
						{/* Key Browser - Two Panel Layout */}
						<div className="w-80 border-r flex-shrink-0">
							<KeyList
								keys={keys}
								selectedKey={selectedKey}
								searchPattern={searchPattern}
								isLoading={isLoadingKeys}
								hasMoreKeys={hasMoreKeys}
								onSearchPatternChange={setSearchPattern}
								onSearch={() => loadKeys(searchPattern, "0")}
								onSelectKey={selectKey}
								onDeleteKey={deleteKey}
								onLoadMore={loadMoreKeys}
								onRefresh={refreshKeys}
							/>
						</div>
						<div className="flex-1">
							<KeyValueEditor
								keyName={selectedKey}
								keyInfo={keyInfo}
								keyValue={keyValue}
								editingField={editingField}
								editingValue={editingValue}
								onEditStart={startEditing}
								onEditChange={setEditingValue}
								onSave={saveValue}
								onCancel={cancelEditing}
								onEditJson={handleEditJson}
							/>
						</div>
					</TabsContent>

					<TabsContent
						value="cli"
						className="flex-1 p-4 mt-0 data-[state=inactive]:hidden"
					>
						<CommandConsole
							commandInput={commandInput}
							commandResult={commandResult}
							isExecuting={isExecuting}
							onCommandChange={setCommandInput}
							onExecute={executeCommand}
						/>
					</TabsContent>

					<TabsContent
						value="monitor"
						className="flex-1 mt-0 data-[state=inactive]:hidden"
					>
						<ServerMonitor
							serverInfo={serverInfo}
							isLoading={false}
							onRefresh={loadServerInfo}
						/>
					</TabsContent>
				</Tabs>
			</div>

			{/* JSON Editor Dialog */}
			<JsonEditorDialog
				open={jsonDialogOpen}
				value={jsonEditorValue}
				onValueChange={setJsonEditorValue}
				onSave={handleSaveJson}
				onClose={() => setJsonDialogOpen(false)}
			/>
		</Layout>
	);
}

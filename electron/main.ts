import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { storeService } from "./services/store";
import WindowService from "./services/window.service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		WindowService.win = null;
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		WindowService.createWindow();
	}
});

app.whenReady().then(WindowService.createWindow);

// Function to create a new connection window

// IPC handler to open a new connection window
ipcMain.handle("window:openConnectionWindow", async (_, connectionId) => {
	try {
		// Simply create a new window every time
		const windowId = WindowService.createConnectionWindow(connectionId);
		return { success: true, windowId };
	} catch (error) {
		console.error("Failed to open new window:", error);
		return {
			success: false,
			message:
				error instanceof Error ? error.message : "Unknown error opening window",
		};
	}
});

// IPC handler to focus an existing connection window
ipcMain.handle("window:focusConnectionWindow", async (_, connectionId) => {
	WindowService.focusOnConnectionWindow(connectionId);
});

// IPC handler to get list of open windows
ipcMain.handle("window:getOpenWindows", () => {
	return WindowService.getOpenWindows();
});

// Add IPC handler to get current window ID
ipcMain.handle("window:getCurrentWindowId", (event) => {
	return WindowService.getCurrentWindowId(event);
});

// Update the existing fullscreen handler to accept a window ID
ipcMain.handle("window:setWindowFullscreen", (_, windowId) => {
	WindowService.setWindowFullscreen(windowId);
});

// Connection management IPC handlers
ipcMain.handle("db:connect", async (_, connectionId) => {
	try {
		console.log("Main process: connecting to DB with ID:", connectionId);
		const result = await storeService.connectToDb(connectionId);
		console.log("Main process: connection result:", result);
		return result;
	} catch (error) {
		console.error("Main process: connection error:", error);
		return {
			success: false,
			message:
				error instanceof Error ? error.message : "Unknown connection error",
		};
	}
});

ipcMain.handle("db:disconnect", async (_, connectionId) => {
	return await storeService.disconnectFromDb(connectionId);
});

ipcMain.handle("db:isConnected", (_, connectionId) => {
	return storeService.isConnected(connectionId);
});

ipcMain.handle("db:getActiveConnections", () => {
	return storeService.getActiveConnections();
});

// Database operation IPC handlers
ipcMain.handle("db:query", async (_, connectionId, sql) => {
	if (!connectionId) {
		throw new Error("Connection ID is required");
	}
	return await storeService.query(connectionId, sql);
});

ipcMain.handle("db:getTables", async (_, connectionId) => {
	console.log("Main process: getting tables for connection:", connectionId);

	if (!connectionId) {
		console.error("Main process: connection ID is undefined/empty");
		throw new Error("Connection ID is required");
	}

	try {
		// Check if this connection is actually active
		const isActive = storeService.isConnected(connectionId);
		console.log("Main process: is connection active?", isActive);

		if (!isActive) {
			throw new Error(`Connection ${connectionId} is not active`);
		}

		return await storeService.getTables(connectionId);
	} catch (error) {
		console.error("Main process: error getting tables:", error);
		throw error;
	}
});

ipcMain.handle("db:getTableStructure", async (_, connectionId, tableName) => {
	try {
		const result = await storeService.getTableStructure(
			connectionId,
			tableName,
		);
		return result;
	} catch (error) {
		throw new Error(
			`Failed to get structure for table '${tableName}': ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
	}
});

ipcMain.handle("db:getPrimaryKey", async (_, connectionId, tableName) => {
	try {
		const result = await storeService.getPrimaryKey(connectionId, tableName);
		return result;
	} catch (error) {
		throw new Error(
			`Failed to get primary key for table '${tableName}': ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
	}
});

ipcMain.handle(
	"db:updateCell",
	async (
		_,
		connectionId,
		tableName,
		primaryKeyColumn,
		primaryKeyValue,
		columnToUpdate,
		newValue,
	) => {
		try {
			const result = await storeService.updateCell(
				connectionId,
				tableName,
				primaryKeyColumn,
				primaryKeyValue,
				columnToUpdate,
				newValue,
			);
			return result;
		} catch (error) {
			throw new Error(
				`Failed to update cell in table '${tableName}': ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
		}
	},
);

// Store management IPC handlers
ipcMain.handle("store:getConnections", () => {
	// Get all connections and ensure they have dbType
	const connections = storeService.getConnections();

	// Migrate existing connections without dbType by setting them to MySQL
	const migratedConnections = connections.map((conn) => {
		if (!conn.dbType) {
			return { ...conn, dbType: "mysql" as const };
		}
		return conn;
	});

	// If we had to migrate any connections, save them back
	if (connections.some((conn) => !conn.dbType)) {
		storeService.updateAllConnections(migratedConnections);
	}

	return migratedConnections;
});

ipcMain.handle("store:addConnection", (_, connection) => {
	return storeService.addConnection(connection);
});

ipcMain.handle("store:deleteConnection", (_, id) => {
	return storeService.deleteConnection(id);
});

// Disconnect all active connections before quitting
app.on("before-quit", async () => {
	const activeConnections = storeService.getActiveConnections();
	for (const connectionId of activeConnections) {
		await storeService.disconnectFromDb(connectionId);
	}
});

// Add this to your existing IPC handlers in main.ts
ipcMain.handle("stop-query", async (_, args) => {
	const { connectionId } = args;

	if (!connectionId) {
		return {
			success: false,
			message: "Connection ID is required",
		};
	}

	try {
		const result = await storeService.cancelQuery(connectionId);
		return { success: true, result };
	} catch (error) {
		return {
			success: false,
			message:
				error instanceof Error ? error.message : "Failed to cancel query",
		};
	}
});

// Remove the old query store code and handlers
ipcMain.handle("save-query", async (_, args) => {
	try {
		const result = await storeService.saveQuery(args);
		return result;
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Failed to save query",
		};
	}
});

ipcMain.handle("get-saved-queries", async (_, args) => {
	try {
		const result = await storeService.getSavedQueries(args.connectionId);
		return result;
	} catch (error) {
		return {
			error:
				error instanceof Error ? error.message : "Failed to get saved queries",
		};
	}
});

ipcMain.handle("delete-query", async (_, args) => {
	try {
		const result = await storeService.deleteQuery(args.connectionId, args.name);
		return result;
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Failed to delete query",
		};
	}
});

ipcMain.handle(
	"db:getDatabaseSchema",
	async (_, connectionId, forceRefresh = false) => {
		const data = await storeService.getDatabaseSchema(
			connectionId,
			forceRefresh,
		);
		return data;
	},
);

// Add a new handler specifically for clearing the schema cache
ipcMain.handle("db:clearSchemaCache", async (_, connectionId) => {
	return await storeService.clearCachedSchema(connectionId);
});

// Add these handlers near the other store management IPC handlers
ipcMain.handle("store:getSettings", () => {
	return storeService.getSettings();
});

ipcMain.handle("store:updateSettings", (_, settings) => {
	return storeService.updateSettings(settings);
});

ipcMain.handle("store:updateAISettings", (_, aiSettings) => {
	return storeService.updateAISettings(aiSettings);
});

// AI-related IPC handlers
ipcMain.handle("ai:generateQuery", async (_, args) => {
	try {
		const { message, model, connectionId } = args;

		if (!message) {
			return {
				success: false,
				error: "No message provided",
			};
		}

		// Get API keys from settings
		const settings = storeService.getSettings();
		let apiKey: string | undefined;

		if (model === "gpt") {
			apiKey = settings?.ai?.openaiApiKey;
			if (!apiKey) {
				return {
					success: false,
					error: "OpenAI API key not configured",
				};
			}

			// Here you would implement the actual OpenAI API call
			// In a real implementation, you could use the connectionId to get schema info
			console.log(
				"Would call OpenAI API with message:",
				message,
				"for connection:",
				connectionId,
			);

			// Simulate API response time
			await new Promise((resolve) => setTimeout(resolve, 1000));

			return {
				success: true,
				response: `Here's a SQL query based on your request: \n\n\`\`\`sql\nSELECT * FROM users\nWHERE created_at > NOW() - INTERVAL 7 DAY\nORDER BY created_at DESC;\n\`\`\`\n\nThis query will fetch all users created in the last 7 days, sorted by creation date.`,
			};
		}

		if (model === "claude") {
			apiKey = settings?.ai?.claudeApiKey;
			if (!apiKey) {
				return {
					success: false,
					error: "Claude API key not configured",
				};
			}

			// Here you would implement the actual Anthropic Claude API call
			// In a real implementation, you could use the connectionId to get schema info
			console.log(
				"Would call Claude API with message:",
				message,
				"for connection:",
				connectionId,
			);

			// Simulate API response time
			await new Promise((resolve) => setTimeout(resolve, 1000));

			return {
				success: true,
				response: `Here's a SQL query based on your request: \n\n\`\`\`sql\nSELECT * FROM users\nWHERE created_at > NOW() - INTERVAL 7 DAY\nORDER BY created_at DESC;\n\`\`\`\n\nThis query will fetch all users created in the last 7 days, sorted by creation date.`,
			};
		}

		return {
			success: false,
			error: "Invalid model specified",
		};
	} catch (error) {
		console.error("Error generating AI query:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Unknown error generating query",
		};
	}
});

ipcMain.handle("db:addRow", async (_, connectionId, tableName, data) => {
	try {
		const result = await storeService.addRow(connectionId, tableName, data);
		return result;
	} catch (error) {
		throw new Error(
			`Failed to add new row to table '${tableName}': ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
	}
});

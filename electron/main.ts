import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { storeService } from "./services/store";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, "public")
	: RENDERER_DIST;

let win: BrowserWindow | null;

// Track connection windows
const connectionWindows: Record<string, BrowserWindow> = {};

function createWindow() {
	win = new BrowserWindow({
		icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
		width: 1200,
		height: 800,
		show: false, // Don't show until ready
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
		},
	});

	// Wait for the window to be ready to show
	win.once("ready-to-show", () => {
		if (win) {
			win.show();
			// Don't set fullscreen by default for the main window
			// as that might be disruptive on first launch
		}
	});

	// Test active push message to Renderer-process.
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL);
	} else {
		// win.loadFile('dist/index.html')
		win.loadFile(path.join(RENDERER_DIST, "index.html"));
	}
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.whenReady().then(createWindow);

// Function to create a new connection window
function createConnectionWindow(connectionId: string) {
	// Create a new browser window
	const connectionWindow = new BrowserWindow({
		icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
		width: 1200,
		height: 800,
		show: false, // Don't show until ready
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
		},
	});

	// Load content into the window
	if (VITE_DEV_SERVER_URL) {
		connectionWindow
			.loadURL(`${VITE_DEV_SERVER_URL}`)
			.then(() => {
				// Show window after content is loaded
				connectionWindow.show();
				// Force main window to stay focused
				if (win && !win.isDestroyed()) {
					win.focus();
				}
			})
			.catch((err) =>
				console.error("Failed to load URL in connection window:", err),
			);
	} else {
		connectionWindow
			.loadFile(path.join(RENDERER_DIST, "index.html"))
			.then(() => {
				// Show window after content is loaded
				connectionWindow.show();
				// Force main window to stay focused
				if (win && !win.isDestroyed()) {
					win.focus();
				}
			})
			.catch((err) =>
				console.error("Failed to load file in connection window:", err),
			);
	}

	// Track window close for cleanup
	connectionWindow.on("closed", () => {
		delete connectionWindows[connectionId];
	});

	// Store the window reference
	connectionWindows[connectionId] = connectionWindow;

	return connectionWindow.id;
}

// IPC handler to open a new connection window
ipcMain.handle("window:openConnectionWindow", async (_, connectionId) => {
	try {
		// Simply create a new window every time
		const windowId = createConnectionWindow(connectionId);
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
	try {
		if (
			connectionWindows[connectionId] &&
			!connectionWindows[connectionId].isDestroyed()
		) {
			connectionWindows[connectionId].focus();
			return true;
		}
		return false;
	} catch (error) {
		console.error(
			`Failed to focus window for connection ${connectionId}:`,
			error,
		);
		return false;
	}
});

// IPC handler to get list of open windows
ipcMain.handle("window:getOpenWindows", () => {
	const openWindows: Record<string, boolean> = {};

	// For each tracked connection window, check if it's still valid
	for (const connectionId of Object.keys(connectionWindows)) {
		try {
			const windowExists =
				connectionWindows[connectionId] &&
				!connectionWindows[connectionId].isDestroyed();
			openWindows[connectionId] = windowExists;

			// Clean up tracking if window is destroyed
			if (!windowExists) {
				delete connectionWindows[connectionId];
			}
		} catch (error) {
			console.error(`Error checking window status for ${connectionId}:`, error);
			openWindows[connectionId] = false;
			delete connectionWindows[connectionId];
		}
	}

	return openWindows;
});

// Add IPC handler to get current window ID
ipcMain.handle("window:getCurrentWindowId", (event) => {
	try {
		const webContents = event.sender;
		const win = BrowserWindow.fromWebContents(webContents);
		if (win) {
			return { success: true, windowId: win.id };
		}
		return {
			success: false,
			message: "Cannot find window for this webContents",
		};
	} catch (error) {
		console.error("Failed to get current window ID:", error);
		return {
			success: false,
			message:
				error instanceof Error
					? error.message
					: "Unknown error getting window ID",
		};
	}
});

// Update the existing fullscreen handler to accept a window ID
ipcMain.handle("window:setWindowFullscreen", (_, windowId) => {
	try {
		let targetWindow: BrowserWindow | null = null;

		// If no window ID is provided, use the main window
		if (!windowId) {
			targetWindow = win;
		} else {
			// Find window by ID
			const allWindows = BrowserWindow.getAllWindows();
			targetWindow = allWindows.find((w) => w.id === windowId) || null;
		}

		if (targetWindow && !targetWindow.isDestroyed()) {
			targetWindow.setFullScreen(true);
			return { success: true, windowId: targetWindow.id };
		}

		return { success: false, message: "Window not available" };
	} catch (error) {
		console.error("Failed to set window to fullscreen:", error);
		return {
			success: false,
			message:
				error instanceof Error
					? error.message
					: "Unknown error setting fullscreen",
		};
	}
});

// Keep the old handler for backward compatibility
ipcMain.handle("window:setMainWindowFullscreen", () => {
	try {
		if (win && !win.isDestroyed()) {
			win.setFullScreen(true);
			return { success: true };
		}

		return { success: false, message: "Main window not available" };
	} catch (error) {
		console.error("Failed to set main window to fullscreen:", error);
		return {
			success: false,
			message:
				error instanceof Error
					? error.message
					: "Unknown error setting fullscreen",
		};
	}
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
	console.log(
		"IPC: Getting table structure for table:",
		tableName,
		"connection:",
		connectionId,
	);
	try {
		const result = await storeService.getTableStructure(
			connectionId,
			tableName,
		);
		console.log("IPC: Got table structure:", result);
		return result;
	} catch (error) {
		console.error("IPC: Error getting table structure:", error);
		throw error;
	}
});

ipcMain.handle("db:getPrimaryKey", async (_, connectionId, tableName) => {
	console.log(
		"IPC: Getting primary key for table:",
		tableName,
		"connection:",
		connectionId,
	);
	try {
		const result = await storeService.getPrimaryKey(connectionId, tableName);
		console.log("IPC: Got primary keys:", result);
		return result;
	} catch (error) {
		console.error("IPC: Error getting primary keys:", error);
		throw error;
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
			console.log("Print the connection id here:=======>", connectionId);
			const result = await storeService.updateCell(
				connectionId,
				tableName,
				primaryKeyColumn,
				primaryKeyValue,
				columnToUpdate,
				newValue,
			);
			console.log("IPC: Cell update result:", result);
			return result;
		} catch (error) {
			console.error("IPC: Error updating cell:", error);
			throw error;
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
		console.error("Error cancelling query:", error);
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
		console.error("Error saving query:", error);
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
		console.error("Error getting saved queries:", error);
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
		console.error("Error deleting query:", error);
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
		console.log("Print the database type here=====>", data.dbType);
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

// Add a debug handler for API keys
ipcMain.handle("debug:getAISettings", () => {
	const settings = storeService.getSettings();
	return {
		hasSettings: !!settings,
		hasAISection: !!settings?.ai,
		openaiKeyPresent: !!settings?.ai?.openaiApiKey,
		claudeKeyPresent: !!settings?.ai?.claudeApiKey,
		// Add partial key info for verification without exposing full keys
		openaiKeyPreview: settings?.ai?.openaiApiKey
			? `${settings.ai.openaiApiKey.substring(0, 3)}...${settings.ai.openaiApiKey.substring(settings.ai.openaiApiKey.length - 4)}`
			: null,
		claudeKeyPreview: settings?.ai?.claudeApiKey
			? `${settings.ai.claudeApiKey.substring(0, 3)}...${settings.ai.claudeApiKey.substring(settings.ai.claudeApiKey.length - 4)}`
			: null,
	};
});

ipcMain.handle("db:addRow", async (_, connectionId, tableName, data) => {
	try {
		console.log("IPC: Adding new row to table:", tableName, "data:", data);
		const result = await storeService.addRow(connectionId, tableName, data);
		console.log("IPC: Row addition result:", result);
		return result;
	} catch (error) {
		console.error("IPC: Error adding new row:", error);
		throw error;
	}
});

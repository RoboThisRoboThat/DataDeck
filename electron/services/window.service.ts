import { BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
let __dirname = path.dirname(fileURLToPath(import.meta.url));
class WindowService {
	public connectionWindows: Record<string, BrowserWindow> = {};
	public win: BrowserWindow | null = null;
	public VITE_DEV_SERVER_URL: string | undefined =
		process.env.VITE_DEV_SERVER_URL;
	public MAIN_DIST = "";
	public RENDERER_DIST = "";

	constructor() {
		try {
			// Initialize __dirname first to avoid undefined errors

			// Set APP_ROOT with a fallback to current working directory
			process.env.APP_ROOT = path.join(__dirname, "..");

			// Set up paths after __dirname is properly initialized
			this.MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
			this.RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

			// Set VITE_PUBLIC based on dev server URL
			process.env.VITE_PUBLIC = this.VITE_DEV_SERVER_URL
				? path.join(process.env.APP_ROOT, "public")
				: this.RENDERER_DIST;

			console.log("WindowService initialized with __dirname:", __dirname);
			console.log("APP_ROOT set to:", process.env.APP_ROOT);
		} catch (error) {
			console.error("Error initializing WindowService:", error);
			// Fallback to current working directory if there's an error
			__dirname = process.cwd();
			process.env.APP_ROOT = process.cwd();
			this.MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
			this.RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
		}
	}

	public createConnectionWindow(connectionId: string) {
		// Create a new browser window
		const connectionWindow = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC || "", "icon.png"),
			width: 1200,
			height: 800,
			show: false, // Don't show until ready
			webPreferences: {
				preload: path.join(__dirname, "preload.mjs"),
			},
		});

		// Load content into the window
		if (this.VITE_DEV_SERVER_URL) {
			connectionWindow
				.loadURL(`${this.VITE_DEV_SERVER_URL}`)
				.then(() => {
					// Show window after content is loaded
					connectionWindow.show();
					// Force main window to stay focused
					if (this.win && !this.win.isDestroyed()) {
						this.win.focus();
					}
				})
				.catch((err) =>
					console.error("Failed to load URL in connection window:", err),
				);
		} else {
			connectionWindow
				.loadFile(path.join(this.RENDERER_DIST, "index.html"))
				.then(() => {
					// Show window after content is loaded
					connectionWindow.show();
					// Force main window to stay focused
					if (this.win && !this.win.isDestroyed()) {
						this.win.focus();
					}
				})
				.catch((err) =>
					console.error("Failed to load file in connection window:", err),
				);
		}

		// Track window close for cleanup
		connectionWindow.on("closed", () => {
			delete this.connectionWindows[connectionId];
		});

		// Store the window reference
		this.connectionWindows[connectionId] = connectionWindow;

		return connectionWindow.id;
	}

	public createWindow() {
		try {
			this.win = new BrowserWindow({
				icon: path.join(process.env.VITE_PUBLIC || "", "icon.png"),
				width: 1200,
				height: 800,
				show: false, // Don't show until ready
				webPreferences: {
					preload: path.join(__dirname, "preload.mjs"),
				},
			});

			// Wait for the window to be ready to show
			this.win.once("ready-to-show", () => {
				if (this.win) {
					this.win.show();
					// Don't set fullscreen by default for the main window
					// as that might be disruptive on first launch
				}
			});

			// Test active push message to Renderer-process.
			this.win.webContents.on("did-finish-load", () => {
				this.win?.webContents.send(
					"main-process-message",
					new Date().toLocaleString(),
				);
			});

			if (this.VITE_DEV_SERVER_URL) {
				this.win.loadURL(this.VITE_DEV_SERVER_URL);
			} else {
				// win.loadFile('dist/index.html')
				this.win.loadFile(path.join(this.RENDERER_DIST, "index.html"));
			}
		} catch (error) {
			console.error("Error creating main window:", error);
		}
	}

	public focusOnConnectionWindow(connectionId: string) {
		try {
			if (
				this.connectionWindows[connectionId] &&
				!this.connectionWindows[connectionId].isDestroyed()
			) {
				this.connectionWindows[connectionId].focus();
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
	}

	public getOpenWindows() {
		const openWindows: Record<string, boolean> = {};

		// For each tracked connection window, check if it's still valid
		for (const connectionId of Object.keys(this.connectionWindows)) {
			try {
				const windowExists =
					this.connectionWindows[connectionId] &&
					!this.connectionWindows[connectionId].isDestroyed();
				openWindows[connectionId] = windowExists;

				// Clean up tracking if window is destroyed
				if (!windowExists) {
					delete this.connectionWindows[connectionId];
				}
			} catch (error) {
				console.error(
					`Error checking window status for ${connectionId}:`,
					error,
				);
				openWindows[connectionId] = false;
				delete this.connectionWindows[connectionId];
			}
		}

		return openWindows;
	}

	public getCurrentWindowId(event: Electron.IpcMainInvokeEvent) {
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
	}

	public setWindowFullscreen(windowId: number) {
		try {
			let targetWindow: BrowserWindow | null = null;

			// If no window ID is provided, use the main window
			if (!windowId) {
				targetWindow = this.win;
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
	}
}

export default new WindowService();

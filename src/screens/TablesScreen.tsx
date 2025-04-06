import { useScreen } from "../context/ScreenContext";
import SQLTables from "../features/SQLTables";
import { useState, useEffect } from "react";
import { Database, X, PanelLeft, PanelRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Layout } from "../components/Layout";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { useHotkeys } from "react-hotkeys-hook";

function TablesScreenContent() {
	const {
		setCurrentScreen,
		activeConnectionId,
		activeConnectionName,
		setActiveConnectionId,
		setActiveConnectionName,
	} = useScreen();
	const [isStandaloneWindow, setIsStandaloneWindow] = useState(false);
	const [loadingConnection, setLoadingConnection] = useState(false);
	const [connectionError, setConnectionError] = useState<string | null>(null);

	const {
		isLeftSidebarCollapsed,
		isRightSidebarCollapsed,
		toggleLeftSidebar,
		toggleRightSidebar,
	} = useSidebar();

	// Keyboard shortcuts for sidebar toggles
	useHotkeys(
		"mod+a",
		(event) => {
			event.preventDefault();
			toggleLeftSidebar();
		},
		{ enableOnFormTags: true },
	);
	useHotkeys(
		"mod+d",
		(event) => {
			event.preventDefault(); // Prevent default browser select all
			toggleRightSidebar();
		},
		{ enableOnFormTags: true },
	);

	useEffect(() => {
		async function initializeConnection() {
			// Check if this is a standalone window
			const isSecondary = window.opener !== null || window.name === "secondary";
			setIsStandaloneWindow(isSecondary);

			let connId = activeConnectionId;
			let connName = activeConnectionName;

			// If we don't have an active connection, try to get it from URL params
			if (!connId) {
				const params = new URLSearchParams(window.location.search);
				connId = params.get("connectionId");
				connName = params.get("connectionName");

				if (connId) {
					// Set the connection details from URL
					setActiveConnectionId(connId);
					if (connName) setActiveConnectionName(connName);
				} else if (isSecondary) {
					// Standalone window without connection params should close
					window.close();
					return;
				} else {
					// Main window without connection should go to connection screen
					setCurrentScreen("connection");
					return;
				}
			}

			// Now attempt to connect to the database
			if (connId) {
				setLoadingConnection(true);
				setConnectionError(null);

				try {
					console.log("Connecting to database:", connId);
					const result = await window.database.connect(connId);

					if (!result?.success) {
						const errorMessage = result?.message || "Unknown connection error";
						console.error("Connection failed:", errorMessage);
						setConnectionError(errorMessage);

						// If in standalone window and connection fails, close the window
						if (isSecondary) {
							window.close();
						}
					} else {
						console.log("Successfully connected to database:", connId);
						setConnectionError(null);
					}
				} catch (error) {
					console.error("Error connecting to database:", error);
					setConnectionError(
						error instanceof Error ? error.message : "Unknown connection error",
					);

					if (isSecondary) {
						window.close();
					}
				} finally {
					setLoadingConnection(false);
				}
			}
		}

		initializeConnection();
	}, [
		activeConnectionId,
		activeConnectionName,
		setActiveConnectionId,
		setActiveConnectionName,
		setCurrentScreen,
	]);

	const handleDisconnect = async () => {
		try {
			if (activeConnectionId) {
				console.log("Disconnecting from:", activeConnectionId);
				await window.database.disconnect(activeConnectionId);
			}
			setActiveConnectionId(null);
			setActiveConnectionName(null);

			// If this is a standalone window, close it on disconnect
			if (isStandaloneWindow) {
				window.close();
			} else {
				setCurrentScreen("connection");
			}
		} catch (error) {
			console.error("Failed to disconnect:", error);
		}
	};

	if (loadingConnection) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
				<div className="flex flex-col items-center space-y-4">
					<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
					<p className="text-sm text-muted-foreground">
						Connecting to database...
					</p>
				</div>
			</div>
		);
	}

	if (connectionError) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
				<div className="flex flex-col items-center text-center max-w-md p-6">
					<div className="text-destructive mb-4">
						<X className="size-12 mx-auto" />
					</div>
					<h2 className="text-xl font-medium mb-2">Connection Failed</h2>
					<p className="text-sm text-muted-foreground mb-4">
						{connectionError}
					</p>
					<Button
						variant="default"
						onClick={() => setCurrentScreen("connection")}
					>
						Return to Connections
					</Button>
				</div>
			</div>
		);
	}

	const headerActions = (
		<div className="flex items-center gap-1">
			<Button
				variant="ghost"
				size="sm"
				onClick={toggleLeftSidebar}
				className="text-sm"
				aria-label={
					isLeftSidebarCollapsed
						? "Expand Left Sidebar"
						: "Collapse Left Sidebar"
				}
			>
				<PanelLeft
					className={`size-4 ${!isLeftSidebarCollapsed ? "text-primary" : ""}`}
				/>
			</Button>

			<Button
				variant="ghost"
				size="sm"
				onClick={toggleRightSidebar}
				className="text-sm"
				aria-label={
					isRightSidebarCollapsed
						? "Expand Right Sidebar"
						: "Collapse Right Sidebar"
				}
			>
				<PanelRight
					className={`size-4 ${!isRightSidebarCollapsed ? "text-primary" : ""}`}
				/>
			</Button>

			<span className="h-5 w-px bg-muted mx-1" />
		</div>
	);

	return (
		<Layout
			showThemeToggle={false}
			title={
				<div className="flex items-center gap-2">
					<Database className="size-4 text-primary" />
					<span className="font-medium">
						{activeConnectionName || "Database"}
					</span>
					{activeConnectionId && (
						<span className="text-xs text-muted-foreground">
							({activeConnectionId})
						</span>
					)}
				</div>
			}
			actions={headerActions}
		>
			<div className="flex-1">
				{activeConnectionId ? (
					<SQLTables
						connectionId={activeConnectionId}
						onDisconnect={handleDisconnect}
					/>
				) : (
					<div className="h-full flex items-center justify-center">
						<Button
							variant="default"
							onClick={() => setCurrentScreen("connection")}
						>
							Return to Connections
						</Button>
					</div>
				)}
			</div>
		</Layout>
	);
}

export function TablesScreen() {
	return (
		<SidebarProvider>
			<TablesScreenContent />
		</SidebarProvider>
	);
}

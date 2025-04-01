import { useState, useEffect } from "react";
import { useScreen } from "../context/ScreenContext";
import { AddConnectionModal } from "../components/AddConnectionModal";
import { Trash, Plus, ExternalLink, Database, Settings } from "lucide-react";
import { Button } from "../components/ui/button";
import { Layout } from "../components/Layout";
import type { Connection } from "../types/connection";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "../components/ui/use-toast";

// Define the tab type
type TabType = "connections" | "settings";

export function ConnectionScreen() {
	const { theme } = useTheme();
	const { settings, updateAISettings, isLoading } = useSettings();
	const { toast } = useToast();
	const { setCurrentScreen, setActiveConnectionId, setActiveConnectionName } =
		useScreen();
	const [connections, setConnections] = useState<Connection[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabType>("connections");
	const [error, setError] = useState("");
	const [notification, setNotification] = useState("");

	// State for API keys
	const [openaiKey, setOpenaiKey] = useState<string>("");
	const [claudeKey, setClaudeKey] = useState<string>("");
	const [showOpenaiKey, setShowOpenaiKey] = useState(false);
	const [showClaudeKey, setShowClaudeKey] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		loadConnections();
	}, []);

	// Update local state when settings are loaded or changed
	useEffect(() => {
		if (!isLoading) {
			try {
				// Safely get API keys, providing empty string fallbacks
				const openaiKeyValue = settings?.ai?.openaiApiKey || "";
				const claudeKeyValue = settings?.ai?.claudeApiKey || "";

				console.log("Settings loaded:", {
					openai: openaiKeyValue
						? `*****${openaiKeyValue.slice(-4)}`
						: "(empty)",
					claude: claudeKeyValue
						? `*****${claudeKeyValue.slice(-4)}`
						: "(empty)",
				});

				// Set the state with the values
				setOpenaiKey(openaiKeyValue);
				setClaudeKey(claudeKeyValue);
			} catch (err) {
				console.error("Error setting initial API key values:", err);
				// Initialize with empty strings as fallback
				setOpenaiKey("");
				setClaudeKey("");
			}
		}
	}, [settings, isLoading]);

	// Add this useEffect to reset show password state when switching tabs
	useEffect(() => {
		// When changing tabs, reset the show password state
		setShowOpenaiKey(false);
		setShowClaudeKey(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
		// We specifically want this to run only when changing tabs
	}, [activeTab]);

	const loadConnections = async () => {
		try {
			const savedConnections = await window.store.getConnections();
			setConnections(savedConnections);
		} catch (error) {
			setError("Failed to load connections");
			console.error(error);
		}
	};

	const handleAddConnection = async (connection: Connection) => {
		try {
			const updatedConnections = await window.store.addConnection(connection);
			setConnections(updatedConnections);
		} catch (error) {
			setError("Failed to add connection");
			console.error(error);
		}
	};

	const handleDeleteConnection = async (id: string) => {
		try {
			const updatedConnections = await window.store.deleteConnection(id);
			setConnections(updatedConnections);
		} catch (error) {
			setError("Failed to delete connection");
			console.error(error);
		}
	};

	// Replace the isKeyValid function with this improved version
	const isKeyValid = (key: string | undefined): boolean => {
		if (!key) return false;
		const trimmedKey = key.trim();

		// Check if the key is a reasonable length for API keys
		// Most API keys are at least 20 characters
		return trimmedKey.length >= 20;
	};

	// Simplify the handleSaveSettings function
	const handleSaveSettings = async () => {
		setIsSaving(true);
		try {
			console.log("Saving API settings...");
			console.log(
				"OpenAI Key:",
				openaiKey
					? `*****${openaiKey.substring(openaiKey.length - 4)}`
					: "Not set",
			);
			console.log(
				"Claude Key:",
				claudeKey
					? `*****${claudeKey.substring(claudeKey.length - 4)}`
					: "Not set",
			);

			// Save the API keys
			await updateAISettings({
				openaiApiKey: openaiKey || "",
				claudeApiKey: claudeKey || "",
			});

			toast({
				title: "Settings saved",
				description: "Your API keys have been securely stored.",
				variant: "default",
			});
		} catch (error) {
			console.error("Error saving settings:", error);
			toast({
				title: "Failed to save settings",
				description: `An error occurred while saving your settings. ${error instanceof Error ? error.message : ""}`,
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleConnect = async (connection: Connection) => {
		try {
			// Force a clean string to ensure there's no weird character issues
			const connectionId = String(connection.id).trim();

			if (!connectionId) {
				throw new Error("Connection ID is empty");
			}

			// First, connect to the database
			const result = await window.database.connect(connectionId);

			if (result?.success || result?.connected) {
				console.log("Successfully connected to database:", connectionId);

				// Set the connection ID in context
				setActiveConnectionId(connectionId);
				setActiveConnectionName(connection.name);
				try {
					await window.windowManager.setMainWindowFullscreen();
				} catch (error) {
					console.error("Failed to set fullscreen:", error);
				}

				// Open a new window
				try {
					console.log("Opening new window for connection:", connectionId);
					const windowResult = await window.windowManager.openConnectionWindow(
						connectionId,
						connection.name,
					);

					if (windowResult?.success) {
						console.log("Successfully opened new window");
					} else {
						console.error("Failed to open window:", windowResult?.message);
					}
				} catch (error) {
					console.error("Error opening window:", error);
				}

				// Clear any previous errors
				setError("");

				// Show success notification
				setNotification("Connected to database. A new window has been opened.");
				setTimeout(() => setNotification(""), 5000);

				// Navigate to tables screen immediately
				setCurrentScreen("tables");

				// Set the query parameters with connectionId and connectionName
				const urlParams = new URLSearchParams(window.location.search);
				urlParams.set("connectionId", connectionId);
				urlParams.set("connectionName", connection.name);
				const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
				window.history.replaceState(null, "", newUrl);
			} else {
				const errorMessage = result?.message || "Unknown connection error";
				console.error("Connection failed:", errorMessage);
				setError(errorMessage);
			}
		} catch (error) {
			console.error("Failed to connect:", error);
			setError(error instanceof Error ? error.message : "Failed to connect");
		}
	};

	const renderConnectionsTab = () => (
		<>
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-medium">Database Connections</h2>
				<Button
					variant="default"
					size="sm"
					onClick={() => setIsModalOpen(true)}
					className={"flex items-center gap-1.5"}
				>
					<Plus className="size-4" />
					Add Connection
				</Button>
			</div>

			{error && (
				<div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4 dark:border-destructive/30">
					{error}
				</div>
			)}

			{notification && (
				<div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-md mb-4 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-400">
					{notification}
				</div>
			)}

			<div className="bg-card rounded-lg shadow-sm border border-border">
				{connections.map((connection) => (
					<div
						key={connection.id}
						className="border-b border-border last:border-b-0"
					>
						<Button
							variant="ghost"
							onClick={() => handleConnect(connection)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									handleConnect(connection);
								}
							}}
							className="flex justify-between p-4 w-full text-left hover:bg-muted/40 h-auto"
						>
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<h3 className="text-base font-medium">{connection.name}</h3>
									<span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
										{connection.dbType === "mysql" ? "MySQL" : "PostgreSQL"}
									</span>
								</div>
								<div className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
									<ExternalLink className="size-3.5" />
									{connection.host}:{connection.port} • {connection.database}
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="text-muted-foreground hover:text-destructive"
								onClick={(e) => {
									e.stopPropagation();
									handleDeleteConnection(connection.id);
								}}
							>
								<Trash className="size-4" />
							</Button>
						</Button>
					</div>
				))}

				{connections.length === 0 && (
					<div className="px-6 py-8 text-center text-muted-foreground">
						No connections added yet. Click the "Add Connection" button to get
						started.
					</div>
				)}
			</div>
		</>
	);

	const renderSettingsTab = () => {
		// Add a small loading indicator while settings are being loaded
		if (isLoading) {
			return (
				<div className="flex items-center justify-center py-12">
					<div className="flex flex-col items-center gap-2">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						<p className="text-sm text-muted-foreground">Loading settings...</p>
					</div>
				</div>
			);
		}

		return (
			<>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-lg font-medium">AI Integration Settings</h2>
					<Button
						variant="default"
						size="sm"
						onClick={handleSaveSettings}
						disabled={isSaving}
						className={`flex items-center gap-1.5 ${theme === "dark" ? "text-white" : "text-black"}`}
					>
						{isSaving ? "Saving..." : "Save Changes"}
					</Button>
				</div>

				<div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6">
					<div className="grid gap-6">
						<div>
							<h3 className="text-base font-medium mb-3 sm:mb-4">API Keys</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Enter your API keys to enable AI features in Data Deck. Your
								keys are stored securely and encrypted.
							</p>

							<div className="grid gap-4 sm:gap-6">
								<div className="grid gap-2">
									<Label
										htmlFor="openai-key"
										className="text-left flex items-center gap-1"
									>
										OpenAI API Key
										<span
											className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
												isKeyValid(openaiKey)
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
											}`}
										>
											{isKeyValid(openaiKey) ? "Active" : "Not Set"}
										</span>
									</Label>
									<div className="relative">
										<Input
											id="openai-key"
											value={openaiKey}
											onChange={(e) => setOpenaiKey(e.target.value)}
											type={showOpenaiKey ? "text" : "password"}
											className="pr-10"
											placeholder="sk-..."
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="absolute right-0 top-0 h-full aspect-square"
											onClick={() => setShowOpenaiKey(!showOpenaiKey)}
										>
											{showOpenaiKey ? (
												<EyeOff className="size-4" />
											) : (
												<Eye className="size-4" />
											)}
										</Button>
									</div>
									<p className="text-sm text-muted-foreground">
										Used for GPT models like GPT-4.{" "}
										<a
											href="https://platform.openai.com/api-keys"
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline"
										>
											Get your API key
										</a>
									</p>
								</div>

								<div className="grid gap-2">
									<Label
										htmlFor="claude-key"
										className="text-left flex items-center gap-1"
									>
										Anthropic Claude API Key
										<span
											className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
												isKeyValid(claudeKey)
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
											}`}
										>
											{isKeyValid(claudeKey) ? "Active" : "Not Set"}
										</span>
									</Label>
									<div className="relative">
										<Input
											id="claude-key"
											value={claudeKey}
											onChange={(e) => setClaudeKey(e.target.value)}
											type={showClaudeKey ? "text" : "password"}
											className="pr-10"
											placeholder="sk-ant-..."
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="absolute right-0 top-0 h-full aspect-square"
											onClick={() => setShowClaudeKey(!showClaudeKey)}
										>
											{showClaudeKey ? (
												<EyeOff className="size-4" />
											) : (
												<Eye className="size-4" />
											)}
										</Button>
									</div>
									<p className="text-sm text-muted-foreground">
										Used for Claude models.{" "}
										<a
											href="https://console.anthropic.com/settings/keys"
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline"
										>
											Get your API key
										</a>
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</>
		);
	};

	return (
		<Layout title="Data Deck" showThemeToggle={false}>
			<div className="flex-1 p-4 overflow-auto">
				<div className="max-w-4xl mx-auto">
					<div className="border-b border-border mb-6">
						<div className="flex space-x-4 sm:space-x-6">
							<button
								type="button"
								onClick={() => setActiveTab("connections")}
								className={`flex items-center gap-1 sm:gap-2 px-1 py-3 border-b-2 font-medium text-sm transition-colors ${
									activeTab === "connections"
										? "border-primary text-primary"
										: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
								}`}
							>
								<Database className="size-4" />
								<span>Connections</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("settings")}
								className={`flex items-center gap-1 sm:gap-2 px-1 py-3 border-b-2 font-medium text-sm transition-colors ${
									activeTab === "settings"
										? "border-primary text-primary"
										: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
								}`}
							>
								<Settings className="size-4" />
								<span>Settings</span>
							</button>
						</div>
					</div>

					{activeTab === "connections"
						? renderConnectionsTab()
						: renderSettingsTab()}
				</div>
			</div>

			<AddConnectionModal
				open={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onAdd={handleAddConnection}
			/>
		</Layout>
	);
}

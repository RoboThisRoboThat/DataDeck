import { useState, useEffect, useRef } from "react";
import { FiSend, FiAlertCircle, FiArrowRight } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/context/SettingsContext";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Message {
	id: string;
	content: string;
	role: "user" | "assistant";
	timestamp: Date;
	pending?: boolean;
}

// Define model options
interface ModelOption {
	id: string;
	name: string;
	provider: "gpt" | "claude";
}

// Define types for database schema
interface TableSchema {
	name: string;
	columns: Array<{
		name: string;
		type: string;
		length?: number;
		precision?: number;
		isPrimary: boolean;
		isNullable: boolean;
		defaultValue?: string;
	}>;
	foreignKeys: Array<{
		column: string;
		referencedTable: string;
		referencedColumn: string;
	}>;
}

interface DatabaseResponse {
	data: Array<{
		name: string;
		columns: Array<{
			name: string;
			type: string;
			length?: number;
			precision?: number;
			isPrimary: boolean;
			isNullable: boolean;
			defaultValue?: string;
		}>;
		foreignKeys: Array<{
			column: string;
			referencedTable: string;
			referencedColumn: string;
		}>;
	}>;
	dbType: string;
}

const AVAILABLE_MODELS: ModelOption[] = [
	// OpenAI models
	{ id: "gpt-4o", name: "GPT-4o", provider: "gpt" },
	{ id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "gpt" },
	{ id: "gpt-4", name: "GPT-4", provider: "gpt" },
	{ id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "gpt" },

	// Anthropic models
	{ id: "claude-3-opus", name: "Claude 3 Opus", provider: "claude" },
	{ id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "claude" },
	{ id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "claude" },
	{ id: "claude-2", name: "Claude 2", provider: "claude" },
];

interface AIQueriesProps {
	connectionId: string;
}

const AIQueries = ({ connectionId }: AIQueriesProps) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [activeProvider, setActiveProvider] = useState<"gpt" | "claude">("gpt");
	const [selectedModelId, setSelectedModelId] = useState<string>("gpt-4o");
	const [apiKeys, setApiKeys] = useState<{
		openai: string | null;
		claude: string | null;
	}>({
		openai: null,
		claude: null,
	});
	const [error, setError] = useState<string | null>(null);
	const [tableSchemas, setTableSchemas] = useState<TableSchema[]>([]);
	const [loadingSchema, setLoadingSchema] = useState(true);
	const [databaseType, setDatabaseType] = useState<string>("unknown");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const { settings, isLoading: settingsLoading } = useSettings();

	// Filter available models by provider
	const availableModels = AVAILABLE_MODELS.filter(
		(model) => model.provider === activeProvider,
	);

	// Load database schema
	useEffect(() => {
		const fetchSchema = async () => {
			try {
				const response: DatabaseResponse =
					await window.database.getDatabaseSchema(connectionId);
				// Map the schema from the database to match our component's expected interface
				const mappedSchema: TableSchema[] = response.data.map((table) => ({
					name: table.name,
					columns: table.columns.map((column) => ({
						name: column.name,
						type: column.type,
						length: column.length,
						precision: column.precision,
						isPrimary: column.isPrimary,
						isNullable: column.isNullable,
						defaultValue: column.defaultValue,
					})),
					foreignKeys: table.foreignKeys || [],
				}));
				setTableSchemas(mappedSchema);
				setDatabaseType(response.dbType);
				setLoadingSchema(false);
			} catch (error) {
				console.error("Error fetching schema:", error);
				setLoadingSchema(false);
			}
		};

		fetchSchema();
	}, [connectionId]);

	// Load API keys from settings context
	useEffect(() => {
		if (!settingsLoading) {
			try {
				// Set API keys in state
				const openaiKey = settings?.ai?.openaiApiKey || null;
				const claudeKey = settings?.ai?.claudeApiKey || null;

				setApiKeys({
					openai: openaiKey,
					claude: claudeKey,
				});

				// If openAI key is missing but Claude is available, default to Claude
				if (!openaiKey && claudeKey) {
					setActiveProvider("claude");
					setSelectedModelId("claude-3-opus"); // Default Claude model
				}
			} catch (error) {
				console.error("Error processing settings:", error);
				setError("Failed to load API keys. Please check settings.");
			}
		}
	}, [settings, settingsLoading]);

	// When provider changes, update the selected model
	useEffect(() => {
		// Set default model for the selected provider
		const defaultModel = AVAILABLE_MODELS.find(
			(model) => model.provider === activeProvider,
		);
		if (defaultModel) {
			setSelectedModelId(defaultModel.id);
		}
	}, [activeProvider]);

	// Scroll to bottom on initial render
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	// Scroll to bottom when message count changes
	useEffect(() => {
		if (messages.length > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages.length]);

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputValue(e.target.value);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	// Create a formatted database schema for AI prompt context
	const formatSchemaForAI = (): string => {
		if (!tableSchemas || tableSchemas.length === 0)
			return "No database schema available.";

		let formattedSchema = `DATABASE TYPE: ${databaseType.toUpperCase()}\n\nDATABASE SCHEMA:\n`;

		for (const table of tableSchemas) {
			formattedSchema += `\nTABLE: ${table.name}\n`;

			// Add columns
			formattedSchema += "COLUMNS:\n";
			for (const column of table.columns) {
				formattedSchema += `- ${column.name} (${column.type}${column.length ? `(${column.length})` : ""})${column.isPrimary ? " PRIMARY KEY" : ""}${column.isNullable ? "" : " NOT NULL"}${column.defaultValue ? ` DEFAULT ${column.defaultValue}` : ""}\n`;
			}

			// Add foreign keys if present
			if (table.foreignKeys.length > 0) {
				formattedSchema += "\nFOREIGN KEYS:\n";
				for (const fk of table.foreignKeys) {
					formattedSchema += `- ${fk.column} -> ${fk.referencedTable}.${fk.referencedColumn}\n`;
				}
			}
		}

		return formattedSchema;
	};

	const sendMessage = async () => {
		console.log("database schema:=========>", tableSchemas);
		if (!inputValue.trim()) return;

		// Check if we have the appropriate API key
		const activeKey =
			activeProvider === "gpt" ? apiKeys.openai : apiKeys.claude;
		if (!activeKey) {
			setError(
				`No API key configured for ${activeProvider === "gpt" ? "OpenAI" : "Claude"}. Please add your API key in the settings.`,
			);
			return;
		}

		// Clear any previous errors
		setError(null);

		// Create a new user message
		const userMessage: Message = {
			id: Date.now().toString(),
			content: inputValue,
			role: "user",
			timestamp: new Date(),
		};

		// Create a pending assistant message
		const pendingAssistantMessage: Message = {
			id: (Date.now() + 1).toString(),
			content: "",
			role: "assistant",
			timestamp: new Date(),
			pending: true,
		};

		// Add messages to state
		setMessages((prev) => [...prev, userMessage, pendingAssistantMessage]);
		setInputValue("");
		setIsLoading(true);

		try {
			// Prepare the database schema context
			const schemaContext = formatSchemaForAI();

			// In a real implementation, we would send the schemaContext along with the user query to the AI API
			// For now, we're using a mock implementation that simulates AI responses

			// Simulate network delay - remove in production with actual API calls
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Example response format that would come from the actual AI service
			// TODO: Replace with actual API calls to OpenAI or Anthropic
			const response = generateSampleSQLResponse(inputValue, schemaContext);

			// Update the pending message with the response
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === pendingAssistantMessage.id
						? {
								...msg,
								content: response,
								pending: false,
							}
						: msg,
				),
			);
		} catch (err) {
			console.error("Error generating response:", err);
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === pendingAssistantMessage.id
						? {
								...msg,
								content:
									"I'm sorry, but I encountered an error generating a response. Please try again.",
								pending: false,
							}
						: msg,
				),
			);
			setError(
				err instanceof Error
					? err.message
					: "Failed to generate a response. Please try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	// This is just a placeholder function to generate example responses
	// In a real app, this would be an API call to OpenAI/Anthropic
	const generateSampleSQLResponse = (
		query: string,
		schemaContext: string,
	): string => {
		// Note: This is a simplified mock function. In production, you would:
		// 1. Send the user query + schema context to the OpenAI/Claude API
		// 2. Process the response and return it

		// For now, we'll continue with pattern matching for demo purposes
		let sqlQuery = "";

		// Check if we have schema information to use in the responses
		const hasSchema = tableSchemas && tableSchemas.length > 0;

		// Look for table names in the schema to make the examples more realistic
		const userTableName = hasSchema
			? tableSchemas.find((t) => t.name.toLowerCase().includes("user"))?.name ||
				"users"
			: "users";

		const orderTableName = hasSchema
			? tableSchemas.find((t) => t.name.toLowerCase().includes("order"))
					?.name || "orders"
			: "orders";

		const productTableName = hasSchema
			? tableSchemas.find((t) => t.name.toLowerCase().includes("product"))
					?.name || "products"
			: "products";

		// Check for specific query patterns and provide appropriate responses
		if (
			query.toLowerCase().includes("user") &&
			query.toLowerCase().includes("last week")
		) {
			sqlQuery = `
Based on your ${databaseType.toUpperCase()} database schema, here's a SQL query to find users who signed up in the last week:

\`\`\`sql
SELECT 
  *
FROM 
  ${userTableName}
WHERE 
  ${
		databaseType.toLowerCase() === "mysql" ||
		databaseType.toLowerCase() === "mariadb"
			? "created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)"
			: databaseType.toLowerCase() === "postgresql"
				? "created_at >= CURRENT_DATE - INTERVAL '7 days'"
				: databaseType.toLowerCase() === "sqlite"
					? "created_at >= date('now', '-7 days')"
					: databaseType.toLowerCase() === "mssql"
						? "created_at >= DATEADD(day, -7, GETDATE())"
						: "created_at >= (CURRENT_DATE - 7)"
	}
ORDER BY 
  created_at DESC;
\`\`\`

This query selects user information for all users where the creation date is within the last 7 days. The results are ordered by creation date (newest first).`;
		} else if (
			query.toLowerCase().includes("order") &&
			query.toLowerCase().includes("greater than")
		) {
			sqlQuery = `
Based on your ${databaseType.toUpperCase()} database schema, here's a SQL query to find orders with a total value greater than $100:

\`\`\`sql
SELECT 
  o.*
FROM 
  ${orderTableName} o
WHERE 
  o.total_amount > 100
ORDER BY 
  o.total_amount DESC;
\`\`\`

This query finds all orders with a total amount greater than $100, ordered by the total amount in descending order.`;
		} else if (
			query.toLowerCase().includes("top") &&
			query.toLowerCase().includes("product")
		) {
			sqlQuery = `
Based on your ${databaseType.toUpperCase()} database schema, here's a SQL query to get the top 10 products:

\`\`\`sql
${
	databaseType.toLowerCase() === "mssql"
		? `SELECT TOP 10
  *
FROM 
  ${productTableName}
ORDER BY 
  popularity DESC;`
		: `SELECT 
  *
FROM 
  ${productTableName}
ORDER BY 
  popularity DESC
LIMIT 10;`
}
\`\`\`

This query returns the top 10 products ordered by popularity.`;
		} else if (
			query.toLowerCase().includes("all") &&
			query.toLowerCase().includes("tables")
		) {
			// Special case for listing all tables
			if (hasSchema) {
				const tableList = tableSchemas.map((t) => t.name).join(", ");

				sqlQuery = `
Based on your ${databaseType.toUpperCase()} database schema, here are all the tables in your database:

${tableSchemas.map((t) => `- ${t.name}`).join("\n")}

If you want to see this information using SQL, you can use the following query:

\`\`\`sql
${
	databaseType.toLowerCase() === "mysql" ||
	databaseType.toLowerCase() === "mariadb"
		? "SHOW TABLES;"
		: databaseType.toLowerCase() === "postgresql"
			? "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
			: databaseType.toLowerCase() === "sqlite"
				? "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
				: databaseType.toLowerCase() === "mssql"
					? "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';"
					: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
}
\`\`\`

This query will list all user-created tables in your ${databaseType.toUpperCase()} database.`;
			} else {
				sqlQuery = `
I don't have detailed information about your ${databaseType.toUpperCase()} database schema. To list all tables in your database, you can use this query:

\`\`\`sql
${
	databaseType.toLowerCase() === "mysql" ||
	databaseType.toLowerCase() === "mariadb"
		? "SHOW TABLES;"
		: databaseType.toLowerCase() === "postgresql"
			? "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
			: databaseType.toLowerCase() === "sqlite"
				? "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
				: databaseType.toLowerCase() === "mssql"
					? "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';"
					: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
}
\`\`\``;
			}
		} else {
			// Default response for other queries
			if (hasSchema) {
				// Provide a more helpful response with table information
				const tableList = tableSchemas.map((t) => `- ${t.name}`).join("\n");

				sqlQuery = `
I've analyzed your ${databaseType.toUpperCase()} database schema. Here are the tables in your database:

${tableList}

Please provide more details about what specific data you're looking for, and I'll generate a targeted SQL query for your ${databaseType.toUpperCase()} database.`;
			} else {
				sqlQuery = `
I've analyzed your ${databaseType.toUpperCase()} database schema and can help you create a SQL query based on your request. Here's a general outline of your schema:

${schemaContext.length > 300 ? `${schemaContext.substring(0, 300)}...\n(schema truncated for readability)` : schemaContext}

Please provide more details about what specific data you're looking for, and I'll generate a targeted SQL query for your ${databaseType.toUpperCase()} database.`;
			}
		}

		return sqlQuery;
	};

	const handleCopyQuery = (query: string) => {
		navigator.clipboard.writeText(query);
		// Show a temporary success message
		const temp = error;
		setError("SQL query copied to clipboard!");
		setTimeout(() => setError(temp), 2000);
	};

	// Show loading state when fetching settings or schema
	if (settingsLoading || loadingSchema) {
		return (
			<div className="flex flex-col h-full overflow-hidden">
				<div className="flex-grow overflow-y-auto p-4">
					<div className="flex flex-col items-center justify-center h-full text-center">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
						<p className="text-sm text-muted-foreground mt-4">
							{loadingSchema
								? "Loading database schema..."
								: "Loading settings..."}
						</p>
					</div>
				</div>
			</div>
		);
	}

	// If both API keys are missing, show configuration message
	if (!apiKeys.openai && !apiKeys.claude) {
		return (
			<div className="flex flex-col h-full overflow-hidden">
				<div className="flex-grow overflow-y-auto p-4">
					<div className="flex flex-col items-center justify-center h-full text-center">
						<FiAlertCircle size={48} className="text-amber-500 mb-4" />
						<h3 className="text-lg font-medium mb-2">API Keys Required</h3>
						<p className="text-gray-500 mb-4 max-w-md">
							To use AI-generated SQL queries, you need to configure API keys
							for OpenAI or Anthropic Claude.
						</p>
						<p className="text-sm text-gray-400 mb-6">
							Go to the Settings tab in the main connection screen to add your
							API keys.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Provider and Model Selection */}
			<div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
				<Tabs
					value={activeProvider}
					onValueChange={(value) =>
						setActiveProvider(value as "gpt" | "claude")
					}
					className="w-[400px]"
				>
					<TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
						<TabsTrigger
							value="gpt"
							disabled={!apiKeys.openai}
							className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
						>
							OpenAI
						</TabsTrigger>
						<TabsTrigger
							value="claude"
							disabled={!apiKeys.claude}
							className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
						>
							Anthropic
						</TabsTrigger>
					</TabsList>
				</Tabs>

				<Select value={selectedModelId} onValueChange={setSelectedModelId}>
					<SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
						<SelectValue placeholder="Select a model" />
					</SelectTrigger>
					<SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
						{availableModels.map((model) => (
							<SelectItem
								key={model.id}
								value={model.id}
								className="text-gray-900 dark:text-gray-100"
							>
								{model.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Messages Container */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
				{messages.map((message) => (
					<div
						key={message.id}
						className={`flex ${
							message.role === "assistant" ? "justify-start" : "justify-end"
						}`}
					>
						<div
							className={`max-w-[80%] rounded-lg p-4 ${
								message.role === "assistant"
									? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
									: "bg-blue-600 dark:bg-blue-700 text-white"
							} ${message.pending ? "opacity-70" : ""}`}
						>
							<pre className="whitespace-pre-wrap font-sans">
								{message.content}
							</pre>
						</div>
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* Error Message */}
			{error && (
				<div className="p-4 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-900/50">
					<div className="flex items-center gap-2 text-red-600 dark:text-red-400">
						<FiAlertCircle className="shrink-0" />
						<p className="text-sm">{error}</p>
					</div>
				</div>
			)}

			{/* Input Area */}
			<div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
				<div className="flex gap-4">
					<Textarea
						ref={inputRef}
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						placeholder="Ask me to help you write SQL queries..."
						className="flex-1 resize-none bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
						rows={3}
					/>
					<Button
						onClick={sendMessage}
						disabled={isLoading || !inputValue.trim()}
						className={`shrink-0 self-end ${
							isLoading
								? "bg-blue-400 dark:bg-blue-600"
								: "bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600"
						}`}
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<FiSend className="h-4 w-4" />
						)}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default AIQueries;

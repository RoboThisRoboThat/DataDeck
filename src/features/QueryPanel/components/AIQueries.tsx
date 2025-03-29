import { useState, useEffect, useRef } from "react";
import { FiZap, FiSend, FiAlertCircle, FiArrowRight } from "react-icons/fi";
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

const AIQueries = () => {
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
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const { settings, isLoading: settingsLoading } = useSettings();

	// Filter available models by provider
	const availableModels = AVAILABLE_MODELS.filter(
		(model) => model.provider === activeProvider,
	);

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

	const sendMessage = async () => {
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
			// First, check which model/service to use
			// We'll mimic AI behavior with a local function
			// In a real implementation, you would call the OpenAI or Anthropic APIs here
			// Using the Vercel AI SDK with the correct API key configuration

			// Simulate network delay - remove in production with actual API calls
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Example response format that would come from the actual AI service
			const response = generateSampleSQLResponse(inputValue);

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
	const generateSampleSQLResponse = (query: string): string => {
		// Simple pattern matching to generate sample responses
		let sqlQuery = "";

		if (
			query.toLowerCase().includes("user") &&
			query.toLowerCase().includes("last week")
		) {
			sqlQuery = `
Here's a SQL query to find users who signed up in the last week:

\`\`\`sql
SELECT 
  user_id, 
  username, 
  email, 
  created_at
FROM 
  users
WHERE 
  created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY 
  created_at DESC;
\`\`\`

This query selects user information for all users where the creation date is within the last 7 days. The results are ordered by creation date (newest first).`;
		} else if (
			query.toLowerCase().includes("order") &&
			query.toLowerCase().includes("greater than")
		) {
			sqlQuery = `
Here's a SQL query to find orders with a total value greater than $100:

\`\`\`sql
SELECT 
  o.order_id, 
  o.customer_id, 
  c.customer_name,
  o.order_date, 
  SUM(oi.quantity * oi.unit_price) as total_value
FROM 
  orders o
JOIN 
  order_items oi ON o.order_id = oi.order_id
JOIN 
  customers c ON o.customer_id = c.customer_id
GROUP BY 
  o.order_id, o.customer_id, c.customer_name, o.order_date
HAVING 
  total_value > 100
ORDER BY 
  total_value DESC;
\`\`\`

This query joins the orders, order_items, and customers tables to calculate the total value of each order and returns only those with a value greater than $100.`;
		} else if (
			query.toLowerCase().includes("top") &&
			query.toLowerCase().includes("product")
		) {
			sqlQuery = `
Here's a SQL query to get the top 10 products by quantity sold:

\`\`\`sql
SELECT 
  p.product_id, 
  p.product_name, 
  SUM(oi.quantity) as total_quantity_sold
FROM 
  products p
JOIN 
  order_items oi ON p.product_id = oi.product_id
GROUP BY 
  p.product_id, p.product_name
ORDER BY 
  total_quantity_sold DESC
LIMIT 10;
\`\`\`

This query joins the products and order_items tables to calculate the total quantity sold for each product, then returns the top 10 products ordered by the total quantity sold.`;
		} else {
			sqlQuery = `
I'll help you create a SQL query based on your request. Here's a general query structure:

\`\`\`sql
SELECT 
  column1, 
  column2,
  column3
FROM 
  table_name
WHERE 
  condition
GROUP BY
  column1
ORDER BY
  column2;
\`\`\`

To make this query more specific to your needs, please provide more details about what data you're looking for and the structure of your database tables.`;
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

	// Show loading state
	if (settingsLoading) {
		return (
			<div className="flex flex-col h-full overflow-hidden">
				<div className="flex-grow overflow-y-auto p-4">
					<div className="flex flex-col items-center justify-center h-full text-center">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						<p className="text-sm text-muted-foreground mt-4">
							Loading settings...
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
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header with model selector */}
			<div className="p-4 border-b border-gray-200">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-3">
						{/* Provider selector */}
						<Tabs
							value={activeProvider}
							onValueChange={(value) =>
								setActiveProvider(value as "gpt" | "claude")
							}
							className="w-auto"
						>
							<TabsList>
								<TabsTrigger value="gpt" disabled={!apiKeys.openai}>
									OpenAI
								</TabsTrigger>
								<TabsTrigger value="claude" disabled={!apiKeys.claude}>
									Claude
								</TabsTrigger>
							</TabsList>
						</Tabs>

						{/* Model selector */}
						<Select value={selectedModelId} onValueChange={setSelectedModelId}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="Select model" />
							</SelectTrigger>
							<SelectContent>
								{availableModels.map((model) => (
									<SelectItem key={model.id} value={model.id}>
										{model.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			{/* Messages container - scrollable area */}
			<div className="flex-grow overflow-y-auto p-4">
				{messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center">
						<p className="text-gray-600 mb-1 font-medium">AI Query Assistant</p>
						<p className="text-gray-500 max-w-xs mb-6">
							I can help you write SQL queries for your database. Just describe
							what you need!
						</p>

						<div className="flex flex-col gap-2 w-full max-w-md">
							<Button
								variant="outline"
								className="justify-between py-6"
								onClick={() =>
									setInputValue(
										"Show me all users who signed up in the last week",
									)
								}
							>
								Show me all users who signed up in the last week
								<FiArrowRight />
							</Button>
							<Button
								variant="outline"
								className="justify-between py-6"
								onClick={() =>
									setInputValue(
										"Find orders with a total value greater than $100",
									)
								}
							>
								Find orders with a total value greater than $100
								<FiArrowRight />
							</Button>
							<Button
								variant="outline"
								className="justify-between py-6"
								onClick={() =>
									setInputValue("Get top 10 products by quantity sold")
								}
							>
								Get top 10 products by quantity sold
								<FiArrowRight />
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						{messages.map((message) => (
							<div
								key={message.id}
								className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
							>
								<div
									className={`max-w-3/4 px-4 py-3 rounded-lg ${
										message.role === "user"
											? "bg-primary text-primary-foreground"
											: "bg-muted border border-border"
									}`}
								>
									{message.pending ? (
										<div className="flex items-center space-x-2">
											<div className="w-2 h-2 rounded-full bg-current animate-bounce" />
											<div
												className="w-2 h-2 rounded-full bg-current animate-bounce"
												style={{ animationDelay: "0.2s" }}
											/>
											<div
												className="w-2 h-2 rounded-full bg-current animate-bounce"
												style={{ animationDelay: "0.4s" }}
											/>
										</div>
									) : (
										<div className="whitespace-pre-wrap">
											{message.content.includes("```sql") ? (
												<>
													{message.content.split("```sql")[0]}
													<div className="my-2 bg-gray-800 text-white p-3 rounded-md overflow-auto relative">
														<pre>
															<code className="language-sql">
																{
																	message.content
																		.split("```sql")[1]
																		.split("```")[0]
																}
															</code>
														</pre>
														<Button
															variant="ghost"
															size="sm"
															className="absolute top-2 right-2 h-7 text-xs"
															onClick={() =>
																handleCopyQuery(
																	message.content
																		.split("```sql")[1]
																		.split("```")[0],
																)
															}
														>
															Copy
														</Button>
													</div>
													{message.content.split("```")[2] || ""}
												</>
											) : (
												message.content
											)}
										</div>
									)}
								</div>
							</div>
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Error message if any */}
			{error && (
				<div
					className={`mx-4 mb-4 p-2 ${error.includes("copied") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"} rounded-md border`}
				>
					<FiAlertCircle className="inline-block mr-2" />
					{error}
				</div>
			)}

			{/* Fixed input box at the bottom */}
			<div className="p-4 border-t border-gray-200 bg-white shadow-md">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						sendMessage();
					}}
					className="relative"
				>
					<Textarea
						ref={inputRef}
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						placeholder="Describe the SQL query you need..."
						className="resize-none min-h-[90px] max-h-[300px] px-4 py-3 pr-[60px] rounded-xl border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200"
						disabled={isLoading}
						style={{ overflowY: "auto" }}
					/>
					<div className="absolute bottom-3 right-3 flex gap-2">
						{inputValue.trim().length > 0 && (
							<Button
								type="submit"
								disabled={!inputValue.trim() || isLoading}
								className="h-9 w-9 rounded-full bg-indigo-600 hover:bg-indigo-700 p-0 flex items-center justify-center shadow-md transition-all duration-200"
							>
								{isLoading ? (
									<div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								) : (
									<FiSend className="h-4 w-4" />
								)}
							</Button>
						)}
					</div>
					<div className="mt-2 flex justify-between items-center text-xs text-gray-500">
						<span>Press Enter to send, Shift+Enter for new line</span>
						<span className="text-right">
							{inputValue.length > 0 ? `${inputValue.length} characters` : ""}
						</span>
					</div>
				</form>
			</div>
		</div>
	);
};

export default AIQueries;

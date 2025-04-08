import React, {
	forwardRef,
	useImperativeHandle,
	useEffect,
	useState,
} from "react";
import Editor from "@monaco-editor/react";
import type { OnMount, OnChange, BeforeMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useTheme } from "../../../context/ThemeContext";

interface DatabaseSchema {
	name: string;
	columns: Array<{
		name: string;
		type: string;
	}>;
}

type DatabaseResponse = DatabaseSchema | DatabaseSchema[];

interface QueryEditorProps {
	value: string;
	onChange: (value: string) => void;
	onExecute: () => void;
	isExecuting: boolean;
	onSelectionChange?: (selectedText: string) => void;
	connectionId: string;
}

// SQL keywords for auto-completion
const SQL_KEYWORDS = [
	"SELECT",
	"FROM",
	"WHERE",
	"GROUP BY",
	"ORDER BY",
	"HAVING",
	"LIMIT",
	"INSERT",
	"UPDATE",
	"DELETE",
	"CREATE",
	"ALTER",
	"DROP",
	"TRUNCATE",
	"JOIN",
	"INNER JOIN",
	"LEFT JOIN",
	"RIGHT JOIN",
	"FULL JOIN",
	"UNION",
	"AS",
	"ON",
	"AND",
	"OR",
	"NOT",
	"IN",
	"BETWEEN",
	"LIKE",
	"IS NULL",
	"IS NOT NULL",
	"COUNT",
	"SUM",
	"AVG",
	"MIN",
	"MAX",
	"DISTINCT",
	"ALL",
	"TABLE",
	"INDEX",
	"PRIMARY KEY",
	"FOREIGN KEY",
	"REFERENCES",
	"CONSTRAINT",
	"DEFAULT",
	"NULL",
	"NOT NULL",
	"AUTO_INCREMENT",
	"INT",
	"VARCHAR",
	"TEXT",
	"DATE",
	"DATETIME",
	"TIMESTAMP",
	"BOOLEAN",
];

// SQL snippets for common operations
const SQL_SNIPPETS = [
	{
		label: "sel-all",
		documentation: "SELECT all columns from a table",
		insertText: "SELECT * FROM ${1:table_name}",
	},
	{
		label: "sel-where",
		documentation: "SELECT with WHERE condition",
		insertText: "SELECT * FROM ${1:table_name} WHERE ${2:condition}",
	},
	{
		label: "join",
		documentation: "INNER JOIN statement",
		insertText:
			"SELECT * FROM ${1:table1} INNER JOIN ${2:table2} ON ${1:table1}.${3:id} = ${2:table2}.${4:foreign_key}",
	},
	{
		label: "group",
		documentation: "SELECT with GROUP BY",
		insertText:
			"SELECT ${1:column}, COUNT(*) FROM ${2:table_name} GROUP BY ${1:column}",
	},
	{
		label: "order",
		documentation: "SELECT with ORDER BY",
		insertText:
			"SELECT * FROM ${1:table_name} ORDER BY ${2:column} ${3:ASC|DESC}",
	},
];

// Interface for table schema information
interface TableSchema {
	name: string;
	columns: ColumnSchema[];
}

interface ColumnSchema {
	name: string;
	type: string;
	table: string;
}

interface EditorRefType {
	focus: () => void;
	getSelectedText: () => string;
}

const QueryEditor = forwardRef<EditorRefType, QueryEditorProps>(
	(
		{
			value,
			onChange,
			onExecute,
			isExecuting,
			onSelectionChange,
			connectionId,
		},
		ref,
	) => {
		// Reference to the editor instance
		const editorRef = React.useRef<Monaco.editor.IStandaloneCodeEditor | null>(
			null,
		);
		const [tableSchemas, setTableSchemas] = useState<TableSchema[]>([]);
		const [monacoInstance, setMonacoInstance] = useState<typeof Monaco | null>(
			null,
		);
		const { theme } = useTheme();

		// Fetch the schema when the component mounts
		useEffect(() => {
			const fetchSchema = async () => {
				try {
					const response = (await window.database.getDatabaseSchema(
						connectionId,
					)) as unknown as DatabaseResponse;
					const schema = Array.isArray(response) ? response : [response];
					// Map the schema from the database to match our component's expected interface
					const mappedSchema = schema.map((table) => ({
						name: table.name,
						columns: table.columns.map((column) => ({
							name: column.name,
							type: column.type,
							table: table.name,
						})),
					}));
					setTableSchemas(mappedSchema);
				} catch (error) {
					console.error("Error fetching schema:", error);
				}
			};

			fetchSchema();
		}, [connectionId]);

		// Register SQL language support when Monaco instance is available
		useEffect(() => {
			if (!monacoInstance) return;

			console.log(
				"Monaco instance available, SQL language should be registered",
			);

			return () => {
				// Cleanup if needed
			};
		}, [monacoInstance]);

		// Before mount handler to set up the Monaco environment
		const handleBeforeMount: BeforeMount = (monaco) => {
			// Ensure SQL language is registered
			monaco.languages.register({ id: "sql" });

			// Add SQL language auto-formatting configuration
			monaco.languages.setLanguageConfiguration("sql", {
				comments: {
					lineComment: "--",
					blockComment: ["/*", "*/"],
				},
				brackets: [
					["{", "}"],
					["[", "]"],
					["(", ")"],
				],
				autoClosingPairs: [
					{ open: "{", close: "}" },
					{ open: "[", close: "]" },
					{ open: "(", close: ")" },
					{ open: '"', close: '"' },
					{ open: "'", close: "'" },
				],
				surroundingPairs: [
					{ open: "{", close: "}" },
					{ open: "[", close: "]" },
					{ open: "(", close: ")" },
					{ open: '"', close: '"' },
					{ open: "'", close: "'" },
				],
				// Define a more SQL-friendly word pattern
				wordPattern: /[a-zA-Z0-9_]+/,
			});
		};

		// Register completion providers when schema information or Monaco instance changes
		useEffect(() => {
			if (!monacoInstance) return;

			console.log(
				"Registering completion provider with schemas:",
				tableSchemas,
			);

			// Add a keypress handler to trigger intellisense at specific times
			const keypressHandler = editorRef.current?.onKeyUp((e) => {
				// Only trigger on period for column intellisense
				if (
					e.code === "Period" ||
					e.keyCode === monacoInstance.KeyCode.Period
				) {
					const position = editorRef.current?.getPosition();
					if (position) {
						// Trigger suggestions after a short delay
						setTimeout(() => {
							editorRef.current?.trigger(
								"keyboard",
								"editor.action.triggerSuggest",
								{},
							);
						}, 10);
					}
				}
			});

			// Create SQL completion item provider
			const completionProvider =
				monacoInstance.languages.registerCompletionItemProvider("sql", {
					triggerCharacters: [" ", ".", ",", "(", "\n"],
					provideCompletionItems: (model, position) => {
						const textUntilPosition = model.getValueInRange({
							startLineNumber: 1,
							startColumn: 1,
							endLineNumber: position.lineNumber,
							endColumn: position.column,
						});

						const wordUntilPosition = model.getWordUntilPosition(position);
						const range = {
							startLineNumber: position.lineNumber,
							endLineNumber: position.lineNumber,
							startColumn: wordUntilPosition.startColumn,
							endColumn: wordUntilPosition.endColumn,
						};

						const suggestions: Monaco.languages.CompletionItem[] = [];

						// Add SQL keywords
						for (const keyword of SQL_KEYWORDS) {
							suggestions.push({
								label: keyword,
								kind: monacoInstance.languages.CompletionItemKind.Keyword,
								insertText: keyword,
								range,
							});
						}

						// Add SQL snippets
						for (const snippet of SQL_SNIPPETS) {
							suggestions.push({
								label: snippet.label,
								kind: monacoInstance.languages.CompletionItemKind.Snippet,
								documentation: snippet.documentation,
								insertText: snippet.insertText,
								insertTextRules:
									monacoInstance.languages.CompletionItemInsertTextRule
										.InsertAsSnippet,
								range,
							});
						}

						// Add table names
						for (const table of tableSchemas) {
							suggestions.push({
								label: table.name,
								kind: monacoInstance.languages.CompletionItemKind.Class,
								insertText: table.name,
								range,
							});
						}

						// Add column names after a table name and period
						const tableNameMatch = textUntilPosition.match(/(\w+)\.\s*$/);
						if (tableNameMatch) {
							const tableName = tableNameMatch[1];
							const table = tableSchemas.find(
								(t) => t.name.toLowerCase() === tableName.toLowerCase(),
							);

							if (table) {
								for (const column of table.columns) {
									suggestions.push({
										label: column.name,
										kind: monacoInstance.languages.CompletionItemKind.Field,
										detail: column.type,
										insertText: column.name,
										range,
									});
								}
							}
						}

						// Add specialized suggestions based on query context and tables
						const queryStart = textUntilPosition.trim().toLowerCase();
						if (
							queryStart === "" ||
							queryStart === "select" ||
							queryStart === "select *"
						) {
							// When starting a new query, suggest complete statements for each table
							for (const table of tableSchemas) {
								const suggestion = `SELECT * FROM ${table.name}`;
								suggestions.push({
									label: suggestion,
									kind: monacoInstance.languages.CompletionItemKind.Snippet,
									detail: `Query all data from ${table.name}`,
									insertText: suggestion,
									range,
									sortText: `00${table.name}`, // Very high priority
								});
							}
						}

						// Add "WHERE table.column =" suggestions after FROM clause
						const fromMatch = textUntilPosition.match(
							/\bFROM\s+(\w+)(?:\s+WHERE\s+)?(?:[\w.]*)?$/i,
						);
						if (fromMatch) {
							const tableName = fromMatch[1];
							const table = tableSchemas.find(
								(t) => t.name.toLowerCase() === tableName.toLowerCase(),
							);

							if (table) {
								// If we're starting a WHERE clause, suggest column equality conditions
								if (textUntilPosition.toLowerCase().includes(" where ")) {
									for (const column of table.columns) {
										// Prioritize id, primary key, and indexed columns
										const isPrimaryKey =
											column.name === "id" ||
											column.name.endsWith("_id") ||
											column.name.includes("key");

										suggestions.push({
											label: `${tableName}.${column.name} = `,
											kind: monacoInstance.languages.CompletionItemKind.Snippet,
											detail: `Filter by ${column.name}`,
											insertText: `${tableName}.${column.name} = `,
											range,
											sortText: isPrimaryKey ? "0" : "1", // Prioritize key columns
										});
									}
								}
							}
						}

						// After INSERT INTO, suggest complete insert statements
						const insertIntoMatch = textUntilPosition.match(
							/INSERT\s+INTO\s+(\w*)$/i,
						);
						if (insertIntoMatch) {
							for (const table of tableSchemas) {
								const columnsString = table.columns
									.map((c) => c.name)
									.join(", ");
								const valuesString = table.columns.map(() => "?").join(", ");

								suggestions.push({
									label: `${table.name} (${columnsString}) VALUES (${valuesString})`,
									kind: monacoInstance.languages.CompletionItemKind.Snippet,
									detail: `Complete INSERT for ${table.name}`,
									insertText: `${table.name} (${columnsString}) VALUES (${valuesString})`,
									range,
									sortText: "00", // High priority
								});
							}
						}

						// Add table suggestions after FROM, JOIN, UPDATE, INTO keywords
						const tableKeywordMatch = textUntilPosition.match(
							/\b(FROM|JOIN|UPDATE|INTO|TABLE)\s+([a-zA-Z0-9_]*)?$/i,
						);
						if (tableKeywordMatch) {
							// Boost priority of table suggestions after these keywords
							for (const table of tableSchemas) {
								suggestions.push({
									label: table.name,
									kind: monacoInstance.languages.CompletionItemKind.Class,
									insertText: table.name,
									range,
									sortText: `0${table.name}`, // Sort tables at the top of suggestion list
									detail: `Table with ${table.columns.length} columns`,
								});
							}
						}

						// Add INSERT statement suggestions
						const insertMatch = textUntilPosition.match(
							/^\s*INSERT\s+(INTO)?\s*$/i,
						);
						if (insertMatch) {
							for (const table of tableSchemas) {
								// Create column list for insert
								const columnsList = table.columns
									.map((col) => col.name)
									.join(", ");
								const valuesList = table.columns.map(() => "?").join(", ");

								suggestions.push({
									label: `INSERT INTO ${table.name}`,
									kind: monacoInstance.languages.CompletionItemKind.Snippet,
									detail: `Insert into ${table.name} table`,
									insertText: `INSERT INTO ${table.name} (${columnsList}) VALUES (${valuesList})`,
									range,
									sortText: "0", // High priority
								});
							}
						}

						// Add smart suggestions for JOIN conditions
						const joinMatch = textUntilPosition.match(
							/\bJOIN\s+(\w+)\s+ON\s+(\w+)?\.?(\w*)?$/i,
						);
						if (joinMatch) {
							const joinedTable = joinMatch[1];
							const firstTable = joinMatch[2] || "";

							// If we have the first table name, suggest its columns
							if (firstTable) {
								const table = tableSchemas.find(
									(t) => t.name.toLowerCase() === firstTable.toLowerCase(),
								);

								if (table) {
									// Add columns from the first table with JOIN completion
									for (const column of table.columns) {
										// Find foreign keys or id columns for better join suggestions
										const isForeignKey =
											column.name.includes("_id") || column.name === "id";

										suggestions.push({
											label: `${firstTable}.${column.name}`,
											kind: monacoInstance.languages.CompletionItemKind.Field,
											detail: isForeignKey
												? `${column.type} (Potential join key)`
												: column.type,
											insertText: `${firstTable}.${column.name}`,
											range,
											sortText: isForeignKey ? "0" : "1", // Prioritize foreign keys
										});

										// If this is a potential foreign key, suggest complete join conditions
										if (isForeignKey) {
											const joinedTableObj = tableSchemas.find(
												(t) =>
													t.name.toLowerCase() === joinedTable.toLowerCase(),
											);

											if (joinedTableObj) {
												// Find matching columns in the joined table
												for (const joinedCol of joinedTableObj.columns) {
													if (
														joinedCol.name === column.name ||
														(column.name === "id" &&
															joinedCol.name === `${firstTable}_id`) ||
														(joinedCol.name === "id" &&
															column.name === `${joinedTable}_id`)
													) {
														suggestions.push({
															label: `${firstTable}.${column.name} = ${joinedTable}.${joinedCol.name}`,
															kind: monacoInstance.languages.CompletionItemKind
																.Snippet,
															detail: "Complete JOIN condition",
															insertText: `${firstTable}.${column.name} = ${joinedTable}.${joinedCol.name}`,
															range,
															sortText: "00", // Highest priority
														});
													}
												}
											}
										}
									}
								}
							}
						}

						// Suggest schema-aware SELECT statements
						const selectMatch = textUntilPosition.match(/^\s*SELECT\s+$/i);
						if (selectMatch) {
							// Add common SELECT patterns as suggestions
							for (const table of tableSchemas) {
								// Suggest SELECT * FROM table
								suggestions.push({
									label: `* FROM ${table.name}`,
									kind: monacoInstance.languages.CompletionItemKind.Snippet,
									detail: `Select all columns from ${table.name}`,
									insertText: `* FROM ${table.name}`,
									range,
								});

								// Suggest SELECT with specific columns
								const columnsText = table.columns
									.slice(0, 3) // First few columns
									.map((col) => col.name)
									.join(", ");

								suggestions.push({
									label: `${columnsText}... FROM ${table.name}`,
									kind: monacoInstance.languages.CompletionItemKind.Snippet,
									detail: `Select columns from ${table.name}`,
									insertText: `${table.columns.map((col) => col.name).join(", ")} FROM ${table.name}`,
									range,
								});
							}
						}

						// Add all column names after SELECT, WHERE, GROUP BY, ORDER BY, etc.
						const clauseMatch = textUntilPosition.match(
							/\b(SELECT|WHERE|GROUP\s+BY|ORDER\s+BY|ON|AND|OR|HAVING)\s+[^;]*$/i,
						);
						if (clauseMatch) {
							// Get all columns from all tables
							for (const table of tableSchemas) {
								for (const column of table.columns) {
									suggestions.push({
										label: column.name,
										kind: monacoInstance.languages.CompletionItemKind.Field,
										detail: `${column.type} (${table.name})`,
										insertText: column.name,
										range,
									});

									// Also add fully qualified column names
									suggestions.push({
										label: `${table.name}.${column.name}`,
										kind: monacoInstance.languages.CompletionItemKind.Field,
										detail: column.type,
										insertText: `${table.name}.${column.name}`,
										range,
									});
								}
							}
						}

						return { suggestions };
					},
				});

			// Clean up provider when component unmounts or dependencies change
			return () => {
				completionProvider.dispose();
				if (keypressHandler) {
					keypressHandler.dispose();
				}
			};
		}, [monacoInstance, tableSchemas]);

		// Handle editor mounting
		const handleEditorDidMount: OnMount = (editor, monaco) => {
			// Save editor reference
			editorRef.current = editor;
			setMonacoInstance(monaco);

			// Add keyboard shortcut for execution (Ctrl+Enter or Cmd+Enter)
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
				if (!isExecuting) {
					onExecute();
				}
			});

			// Add keyboard shortcut for triggering suggestions (Ctrl+Space or Cmd+Space)
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
				editor.trigger("keyboard", "editor.action.triggerSuggest", {});
			});

			// Listen for selection changes
			editor.onDidChangeCursorSelection(() => {
				if (onSelectionChange && !editor.getSelection()?.isEmpty()) {
					const selection = editor.getSelection();
					if (selection) {
						const selectedText = editor.getModel()?.getValueInRange(selection);
						if (selectedText) {
							onSelectionChange(selectedText);
						}
					}
				} else if (onSelectionChange) {
					onSelectionChange("");
				}
			});

			// Focus the editor on mount
			editor.focus();
		};

		// Handle editor value change
		const handleEditorChange: OnChange = (value) => {
			if (value !== undefined) {
				onChange(value);
			}
		};

		// Expose editor methods to parent
		useImperativeHandle(ref, () => ({
			focus: () => {
				if (editorRef.current) {
					editorRef.current.focus();
				}
			},
			getSelectedText: () => {
				if (editorRef.current) {
					const selection = editorRef.current.getSelection();
					if (selection && !selection.isEmpty()) {
						const model = editorRef.current.getModel();
						if (model) {
							return model.getValueInRange(selection);
						}
					}
				}
				return "";
			},
		}));

		return (
			<div className="w-full h-full relative overflow-hidden rounded">
				<Editor
					height="100%"
					defaultLanguage="sql"
					value={value}
					onChange={handleEditorChange}
					beforeMount={handleBeforeMount}
					onMount={handleEditorDidMount}
					options={{
						minimap: { enabled: false },
						lineNumbers: "on",
						fontSize: 14,
						scrollBeyondLastLine: false,
						automaticLayout: true,
						wordWrap: "on",
						suggest: {
							showKeywords: true,
							showSnippets: true,
							showValues: true,
							preview: true,
							filterGraceful: true,
							snippetsPreventQuickSuggestions: false,
							showIcons: true,
							selectionMode: "whenQuickSuggestion",
						},
						quickSuggestions: {
							other: true,
							comments: false,
							strings: false,
						},
						acceptSuggestionOnEnter: "on",
						tabCompletion: "on",
						suggestOnTriggerCharacters: true,
						suggestSelection: "first",
						wordBasedSuggestions: "off",
						parameterHints: { enabled: true },
						fontFamily:
							'"Source Code Pro", Menlo, Monaco, "Courier New", monospace',
						renderLineHighlight: "all",
						cursorBlinking: "smooth",
						smoothScrolling: true,
						padding: { top: 10 },
						colorDecorators: true,
						contextmenu: true,
						scrollbar: {
							verticalScrollbarSize: 12,
							horizontalScrollbarSize: 12,
							vertical: "visible",
							horizontal: "visible",
							verticalHasArrows: false,
							horizontalHasArrows: false,
							useShadows: true,
						},
						overviewRulerBorder: false,
						renderLineHighlightOnlyWhenFocus: false,
						occurrencesHighlight: "singleFile",
						selectionHighlight: true,
						lineHeight: 1.5,
						letterSpacing: 0.5,
					}}
					theme={theme === "dark" ? "vs-dark" : "light"}
					loading={
						<div className="flex items-center justify-center h-full w-full bg-background">
							<div className="text-muted-foreground">Loading SQL editor...</div>
						</div>
					}
				/>
			</div>
		);
	},
);

export default QueryEditor;

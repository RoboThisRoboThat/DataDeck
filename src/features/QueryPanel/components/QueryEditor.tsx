import React, { forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount, OnChange } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

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
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
  'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'UNION',
  'AS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'ALL',
  'TABLE', 'INDEX', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES',
  'CONSTRAINT', 'DEFAULT', 'NULL', 'NOT NULL', 'AUTO_INCREMENT',
  'INT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'TIMESTAMP', 'BOOLEAN'
];

// SQL snippets for common operations
const SQL_SNIPPETS = [
  {
    label: 'sel-all',
    documentation: 'SELECT all columns from a table',
    insertText: 'SELECT * FROM ${1:table_name}'
  },
  {
    label: 'sel-where',
    documentation: 'SELECT with WHERE condition',
    insertText: 'SELECT * FROM ${1:table_name} WHERE ${2:condition}'
  },
  {
    label: 'join',
    documentation: 'INNER JOIN statement',
    insertText: 'SELECT * FROM ${1:table1} INNER JOIN ${2:table2} ON ${1:table1}.${3:id} = ${2:table2}.${4:foreign_key}'
  },
  {
    label: 'group',
    documentation: 'SELECT with GROUP BY',
    insertText: 'SELECT ${1:column}, COUNT(*) FROM ${2:table_name} GROUP BY ${1:column}'
  },
  {
    label: 'order',
    documentation: 'SELECT with ORDER BY',
    insertText: 'SELECT * FROM ${1:table_name} ORDER BY ${2:column} ${3:ASC|DESC}'
  }
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

const QueryEditor = forwardRef<any, QueryEditorProps>(({ 
  value, 
  onChange, 
  onExecute,
  isExecuting,
  onSelectionChange,
  connectionId
}, ref) => {
  // Reference to the editor instance
  const editorRef = React.useRef<any>(null);
  const [tableSchemas, setTableSchemas] = useState<TableSchema[]>([]);
  const [monacoInstance, setMonacoInstance] = useState<typeof Monaco | null>(null);
  
  // Fetch database schema information
  useEffect(() => {
    if (!connectionId) return;

    const fetchDatabaseSchema = async () => {
      try {
        console.log('Fetching database schema for connection:', connectionId);
        
        // Hard-code common tables for testing if needed
        const mockTables = [
          { name: 'users', 
            columns: [
              { name: 'id', type: 'INT', table: 'users' },
              { name: 'username', type: 'VARCHAR', table: 'users' },
              { name: 'email', type: 'VARCHAR', table: 'users' },
              { name: 'created_at', type: 'DATETIME', table: 'users' }
            ]
          },
          { name: 'posts', 
            columns: [
              { name: 'id', type: 'INT', table: 'posts' },
              { name: 'title', type: 'VARCHAR', table: 'posts' },
              { name: 'content', type: 'TEXT', table: 'posts' },
              { name: 'user_id', type: 'INT', table: 'posts' },
              { name: 'created_at', type: 'DATETIME', table: 'posts' }
            ]
          },
          { name: 'comments', 
            columns: [
              { name: 'id', type: 'INT', table: 'comments' },
              { name: 'post_id', type: 'INT', table: 'comments' },
              { name: 'user_id', type: 'INT', table: 'comments' },
              { name: 'comment', type: 'TEXT', table: 'comments' },
              { name: 'created_at', type: 'DATETIME', table: 'comments' }
            ]
          }
        ];
        
        // Set mock tables for immediate suggestions even while real tables load
        setTableSchemas(mockTables);
        
        // Attempt to get actual tables
        try {
          // Use the IPC call to get tables
          const result = await window.electron.ipcRenderer.invoke('execute-query', {
            connectionId,
            sql: "SHOW TABLES"
          });
          
          console.log('Query result for tables:', result);
          
          if (result && !result.error && result.data) {
            const actualTables: TableSchema[] = [];
            
            // Process the tables
            for (const row of result.data) {
              // Extract table name from the result (format varies by DB)
              const tableName = Object.values(row)[0] as string;
              
              if (tableName) {
                // Add default columns for now
                actualTables.push({
                  name: tableName,
                  columns: [
                    { name: 'id', type: 'INT', table: tableName },
                    { name: 'created_at', type: 'DATETIME', table: tableName },
                    { name: 'updated_at', type: 'DATETIME', table: tableName }
                  ]
                });
                
                // Try to get actual columns for this table
                try {
                  const columnResult = await window.electron.ipcRenderer.invoke('execute-query', {
                    connectionId,
                    sql: `DESCRIBE ${tableName}`
                  });
                  
                  console.log(`Column result for ${tableName}:`, columnResult);
                  
                  if (columnResult && !columnResult.error && columnResult.data) {
                    const columns: ColumnSchema[] = [];
                    
                    for (const col of columnResult.data) {
                      // Column naming can be Field, column_name, name, etc. depending on DB
                      const colName = col.Field || col.column_name || col.name || Object.values(col)[0];
                      const colType = col.Type || col.data_type || col.type || 'UNKNOWN';
                      
                      if (colName) {
                        columns.push({
                          name: colName,
                          type: colType,
                          table: tableName
                        });
                      }
                    }
                    
                    if (columns.length > 0) {
                      // Replace the default columns with actual ones
                      const tableIndex = actualTables.findIndex(t => t.name === tableName);
                      if (tableIndex >= 0) {
                        actualTables[tableIndex].columns = columns;
                      }
                    }
                  }
                } catch (err) {
                  console.error(`Error fetching columns for ${tableName}:`, err);
                }
              }
            }
            
            if (actualTables.length > 0) {
              setTableSchemas(actualTables);
              console.log('Schema loaded with actual tables:', actualTables);
            }
          }
        } catch (err) {
          console.error('Error fetching actual tables:', err);
          // Keep using mock tables if real ones fail
        }
      } catch (err) {
        console.error('Error in fetchDatabaseSchema:', err);
      }
    };
    
    fetchDatabaseSchema();
  }, [connectionId]);
  
  // Register completion providers when schema information or Monaco instance changes
  useEffect(() => {
    if (!monacoInstance) return;
    
    console.log('Registering completion provider with schemas:', tableSchemas);
    
    // Create SQL completion item provider
    const completionProvider = monacoInstance.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', ',', '(', '\n'],
      provideCompletionItems: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        const wordUntilPosition = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordUntilPosition.startColumn,
          endColumn: wordUntilPosition.endColumn
        };
        
        const suggestions: Monaco.languages.CompletionItem[] = [];
        
        // Add SQL keywords
        for (const keyword of SQL_KEYWORDS) {
          suggestions.push({
            label: keyword,
            kind: monacoInstance.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range
          });
        }
        
        // Add SQL snippets
        for (const snippet of SQL_SNIPPETS) {
          suggestions.push({
            label: snippet.label,
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            documentation: snippet.documentation,
            insertText: snippet.insertText,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          });
        }
        
        // Add table names
        for (const table of tableSchemas) {
          suggestions.push({
            label: table.name,
            kind: monacoInstance.languages.CompletionItemKind.Class,
            insertText: table.name,
            range
          });
        }
        
        // Add column names after a table name and period
        const tableNameMatch = textUntilPosition.match(/(\w+)\.\s*$/);
        if (tableNameMatch) {
          const tableName = tableNameMatch[1];
          const table = tableSchemas.find(t => t.name.toLowerCase() === tableName.toLowerCase());
          
          if (table) {
            for (const column of table.columns) {
              suggestions.push({
                label: column.name,
                kind: monacoInstance.languages.CompletionItemKind.Field,
                detail: column.type,
                insertText: column.name,
                range
              });
            }
          }
        }
        
        // Add all column names after SELECT, WHERE, GROUP BY, ORDER BY, etc.
        const clauseMatch = textUntilPosition.match(/\b(SELECT|WHERE|GROUP\s+BY|ORDER\s+BY|ON|AND|OR|HAVING)\s+[^;]*$/i);
        if (clauseMatch) {
          // Get all columns from all tables
          for (const table of tableSchemas) {
            for (const column of table.columns) {
              suggestions.push({
                label: column.name,
                kind: monacoInstance.languages.CompletionItemKind.Field,
                detail: `${column.type} (${table.name})`,
                insertText: column.name,
                range
              });
              
              // Also add fully qualified column names
              suggestions.push({
                label: `${table.name}.${column.name}`,
                kind: monacoInstance.languages.CompletionItemKind.Field,
                detail: column.type,
                insertText: `${table.name}.${column.name}`,
                range
              });
            }
          }
        }
        
        return { suggestions };
      }
    });
    
    // Clean up provider when component unmounts or dependencies change
    return () => {
      completionProvider.dispose();
    };
  }, [monacoInstance, tableSchemas]);
  
  // Handle editor mounting
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Save editor reference
    editorRef.current = editor;
    setMonacoInstance(monaco);
    
    // Add keyboard shortcut for execution (Ctrl+Enter or Cmd+Enter)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        if (!isExecuting) {
          onExecute();
        }
      }
    );
    
    // Listen for selection changes
    editor.onDidChangeCursorSelection(e => {
      if (onSelectionChange && !editor.getSelection().isEmpty()) {
        const selectedText = editor.getModel()?.getValueInRange(editor.getSelection());
        if (selectedText) {
          onSelectionChange(selectedText);
        }
      } else if (onSelectionChange) {
        onSelectionChange('');
      }
    });
    
    // Register SQL language features
    monaco.languages.register({ id: 'sql' });
    
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
      return '';
    }
  }));

  return (
    <div className="w-full h-full relative overflow-hidden rounded">
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'on',
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showTables: true,
            showColumns: true,
            preview: true,
            filterGraceful: true,
            snippetsPreventQuickSuggestions: false
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true
          },
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          suggestOnTriggerCharacters: true,
          suggestSelection: 'first',
          wordBasedSuggestions: 'off',
          parameterHints: { enabled: true },
          fontFamily: '"Source Code Pro", Menlo, Monaco, "Courier New", monospace',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 10 },
          colorDecorators: true
        }}
        theme="vs"
        loading={
          <div className="flex items-center justify-center h-full w-full bg-gray-50">
            <div className="text-gray-500">Loading SQL editor...</div>
          </div>
        }
      />
    </div>
  );
});

export default QueryEditor; 
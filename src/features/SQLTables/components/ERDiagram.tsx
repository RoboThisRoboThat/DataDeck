import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MarkerType,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './ERDiagram.css';
import { Button } from '../../../components/ui/button';
import { Loader2 } from 'lucide-react';

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

// Custom node component for database tables
const TableNode = ({
  data
}: {
  data: {
    label: string;
    group?: string;
    groupColor?: string;
    columns: Array<{
      name: string;
      type: string;
      length?: number;
      precision?: number;
      isPrimary: boolean;
      isNullable: boolean;
      isForeign?: boolean;
    }>;
  };
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden" style={{
      borderLeft: data.groupColor ? `4px solid ${data.groupColor}` : undefined
    }}>
      <div className="bg-primary text-primary-foreground font-bold px-4 py-2 text-center border-b border-gray-200 dark:border-gray-700">
        {data.label}
        
        <Handle
          id={`${data.label}.table.source`}
          type="source"
          position={Position.Top}
          className="handle source-handle table-handle"
        />
        
        <Handle
          id={`${data.label}.table.target`}
          type="target"
          position={Position.Bottom}
          className="handle target-handle table-handle"
        />
      </div>
      <div className="px-2 py-1">
        {data.columns.map((col) => (
          <div 
            key={`${data.label}-${col.name}`}
            className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 py-1 text-sm relative"
          >
            <div className="flex items-center gap-1">
              {col.isPrimary && <span className="text-yellow-500">🔑</span>}
              <span className={`${col.isPrimary ? 'font-semibold' : ''} ${col.isForeign ? 'text-blue-500' : ''}`}>
                {col.name}
              </span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {col.type}
              {col.length ? `(${col.length})` : ''}
              {col.isNullable ? '' : ' NOT NULL'}
            </span>
            
            {col.isPrimary && (
              <Handle
                id={`${data.label}.${col.name}.source`}
                type="source"
                position={Position.Right}
                className="handle source-handle"
              />
            )}
            
            {col.isForeign && (
              <Handle
                id={`${data.label}.${col.name}.target`}
                type="target"
                position={Position.Left}
                className="handle target-handle"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Group node component
const GroupNode = ({ data }: NodeProps) => {
  return (
    <div 
      className="group-node rounded-lg"
      style={{
        backgroundColor: data.color ? `${data.color}05` : undefined, // Very subtle background
        // Remove the border styling completely
      }}
    >
    </div>
  );
};

// Define custom node types OUTSIDE the component to prevent re-creation on every render
const nodeTypes: NodeTypes = {
  tableNode: TableNode,
  groupNode: GroupNode,
};

// Generate a list of visually distinct colors for groups
const GROUP_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#6b7280', // gray
  '#9333ea', // purple
];

interface ERDiagramProps {
  connectionId: string;
}

const ERDiagram = ({ connectionId }: ERDiagramProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewportSet, setViewportSet] = useState(false);

  // Load database schema
  useEffect(() => {
    const fetchSchema = async () => {
      if (!connectionId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Try to get the schema (will use cache if available)
        const schemaData = await window.database.getDatabaseSchema(connectionId, false);
        console.log('Database schema:', schemaData);
        setSchema(schemaData);
        
        // Auto-layout and create nodes/edges after getting schema
        createGraphElements(schemaData);
      } catch (err) {
        console.error('Failed to load database schema:', err);
        setError(err instanceof Error ? err.message : 'Failed to load database schema');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchema();
  }, [connectionId]);

  // Create graph elements (nodes and edges) from database schema
  const createGraphElements = useCallback((schema: TableSchema[]) => {
    if (!schema || schema.length === 0) return;
    
    console.log('Creating graph elements from schema:', schema);
    
    // Calculate table dimensions based on column count
    const tableDimensions = new Map<string, { width: number; height: number }>();
    for (const table of schema) {
      // Base dimensions
      const baseWidth = 220;
      // Height depends on number of columns (header + each column)
      const headerHeight = 40;
      const columnHeight = 26; // Average height per column row
      const height = headerHeight + (table.columns.length * columnHeight);
      
      tableDimensions.set(table.name, { 
        width: baseWidth,
        height: height
      });
    }
    
    // Find connected components (table groups)
    const components = findConnectedComponents(schema);
    console.log('Table groups before merging:', components);
    
    // Find isolated tables (tables with no relationships)
    const connectedTables = new Set<string>();
    const isolatedTables: string[] = [];
    
    // Identify connected vs isolated tables
    for (const component of components) {
      if (component.length > 1) {
        // This is a connected component
        for (const table of component) {
          connectedTables.add(table);
        }
      } else {
        // This is an isolated table
        isolatedTables.push(component[0]);
      }
    }
    
    // Create a modified list of components with all isolated tables in one group
    const mergedComponents: string[][] = [];
    
    // Add connected components
    for (const component of components) {
      if (component.length > 1) {
        mergedComponents.push(component);
      }
    }
    
    // Add all isolated tables as a single component
    if (isolatedTables.length > 0) {
      mergedComponents.push(isolatedTables);
    }
    
    console.log('Table groups after merging:', mergedComponents);
    
    // Calculate group dimensions based on tables they contain
    const groupDimensions = mergedComponents.map(component => {
      // Calculate total area needed for all tables in this group
      let totalArea = 0;
      let maxTableWidth = 0;
      let maxTableHeight = 0;
      const totalTableCount = component.length;
      
      for (const tableName of component) {
        const dims = tableDimensions.get(tableName);
        if (dims) {
          totalArea += dims.width * dims.height;
          maxTableWidth = Math.max(maxTableWidth, dims.width);
          maxTableHeight = Math.max(maxTableHeight, dims.height);
        }
      }
      
      // Calculate optimal dimensions for the group
      // For small groups, use fixed dimensions with good spacing
      if (totalTableCount <= 4) {
        return {
          width: Math.max(maxTableWidth * 2 + 300, 700),
          height: Math.max(maxTableHeight * 2 + 300, 500)
        };
      }
      
      // Calculate optimal dimensions for the group
      // For medium groups, adjust based on table count
      if (totalTableCount <= 10) {
        const gridSize = Math.ceil(Math.sqrt(totalTableCount));
        return {
          width: Math.max(maxTableWidth * gridSize + (gridSize - 1) * 150 + 200, 1000),
          height: Math.max(maxTableHeight * gridSize + (gridSize - 1) * 150 + 200, 800)
        };
      }
      
      // For large groups, calculate a more accurate size
      const aspectRatio = 4/3; // Preferred width to height ratio
      const minArea = totalArea * 2.5; // Add 150% extra space for padding and connections
      
      // Calculate width and height based on the desired area and aspect ratio
      const estimatedWidth = Math.sqrt(minArea * aspectRatio);
      const estimatedHeight = estimatedWidth / aspectRatio;
      
      return {
        width: Math.max(Math.ceil(estimatedWidth), 1200),
        height: Math.max(Math.ceil(estimatedHeight), 900)
      };
    });
    
    // Create group names
    const groupNames = mergedComponents.map((component) => {
      if (component === isolatedTables && isolatedTables.length > 0) {
        return "Isolated Tables";
      }
      
      // Try to find a good name for the group based on the tables it contains
      // Use the shortest table name as the primary identifier
      const shortestTableName = [...component].sort((a, b) => a.length - b.length)[0];
      return `${shortestTableName} Group`;
    });
    
    // Assign colors to groups
    const groupColors = mergedComponents.map((_, i) => {
      return GROUP_COLORS[i % GROUP_COLORS.length];
    });
    
    // Create a map from table to group
    const tableToGroup = new Map<string, { 
      name: string, 
      index: number,
      color: string 
    }>();
    
    mergedComponents.forEach((component, index) => {
      for (const table of component) {
        tableToGroup.set(table, { 
          name: groupNames[index], 
          index,
          color: groupColors[index]
        });
      }
    });
    
    // Create a map of foreign keys for marking columns as foreign keys
    const foreignKeyMap = new Map<string, string[]>();
    for (const table of schema) {
      for (const fk of table.foreignKeys) {
        if (!foreignKeyMap.has(table.name)) {
          foreignKeyMap.set(table.name, []);
        }
        foreignKeyMap.get(table.name)?.push(fk.column);
      }
    }
    
    // Create layout positions for each group
    const groupPositions = layoutGroups(mergedComponents, groupDimensions);
    
    // Layout tables within each group
    const tablePositions: { [key: string]: { x: number; y: number } } = {};
    
    mergedComponents.forEach((component, groupIndex) => {
      const groupBasePos = groupPositions[groupIndex];
      const groupSize = groupDimensions[groupIndex];
      
      // Use different layout strategies based on the number of tables
      let groupLayout: Record<string, { x: number; y: number }>;
      
      if (component === isolatedTables && isolatedTables.length > 0) {
        // Grid layout for isolated tables
        groupLayout = layoutIsolatedTables(
          component, 
          tableDimensions, 
          groupSize.width
        );
      } else {
        // Force-directed layout for related tables
        groupLayout = layoutTablesInGroup(
          component, 
          schema, 
          tableDimensions,
          groupSize.width, 
          groupSize.height
        );
      }
      
      // Adjust positions relative to group
      for (const tableName of component) {
        if (groupLayout[tableName]) {
          tablePositions[tableName] = {
            x: groupBasePos.x + groupLayout[tableName].x,
            y: groupBasePos.y + groupLayout[tableName].y
          };
        }
      }
    });
    
    // Create nodes for groups
    const groupNodes: Node[] = mergedComponents.map((component, index) => {
      const groupPos = groupPositions[index];
      const groupSize = groupDimensions[index];
      
      return {
        id: `group-${index}`,
        type: 'groupNode',
        position: { x: groupPos.x, y: groupPos.y },
        style: {
          width: groupSize.width,
          height: groupSize.height,
          zIndex: -1
        },
        data: {
          label: groupNames[index],
          tables: component,
          color: groupColors[index]
        }
      };
    });
    
    // Create nodes for tables
    const tableNodes: Node[] = schema.map((table) => {
      const group = tableToGroup.get(table.name);
      const dimensions = tableDimensions.get(table.name) || { width: 220, height: 150 };
      
      return {
        id: table.name,
        type: 'tableNode',
        position: tablePositions[table.name] || { x: 0, y: 0 },
        data: {
          label: table.name,
          group: group?.name,
          groupColor: group?.color,
          columns: table.columns.map(col => ({
            ...col,
            isForeign: foreignKeyMap.get(table.name)?.includes(col.name) || false
          })),
        },
        style: {
          width: dimensions.width,
        }
      };
    });
    
    // Create edges
    const edges: Edge[] = [];
    
    // Track used colors to distribute them evenly across relationships
    let colorIndex = 0;
    
    for (const table of schema) {
      for (const fk of table.foreignKeys) {
        try {
          // Find the referenced table
          const referencedTable = schema.find(t => t.name === fk.referencedTable);
          
          if (!referencedTable) {
            console.warn(`Referenced table ${fk.referencedTable} not found for foreign key ${table.name}.${fk.column}`);
            continue;
          }
          
          // Determine source and target handles
          const sourceHandle = referencedTable.columns.some(
            col => col.name === fk.referencedColumn && col.isPrimary
          ) 
            ? `${fk.referencedTable}.${fk.referencedColumn}.source`
            : `${fk.referencedTable}.table.source`;
            
          const targetHandle = `${table.name}.${fk.column}.target`;
          
          // Get a unique color for this relationship
          const edgeColor = GROUP_COLORS[colorIndex % GROUP_COLORS.length];
          colorIndex++;
          
          // Add the edge with determined handles
          edges.push({
            id: `${table.name}-${fk.column}-${fk.referencedTable}`,
            source: fk.referencedTable,
            target: table.name,
            sourceHandle,
            targetHandle,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: edgeColor
            },
            style: {
              stroke: edgeColor,
              strokeWidth: 1.5,
            },
            labelBgStyle: { 
              fill: 'rgba(255, 255, 255, 0.8)',
              fillOpacity: 0.8
            },
            labelStyle: { 
              fontSize: 10,
              fill: edgeColor,
              fontWeight: 500
            },
            label: fk.column,
          });
        } catch (err) {
          console.error(`Error creating edge for ${table.name}.${fk.column}:`, err);
        }
      }
    }
    
    // Combine group nodes and table nodes
    setNodes([...groupNodes, ...tableNodes]);
    setEdges(edges);
  }, [setNodes, setEdges]);

  // Layout groups on the canvas with dynamic spacing based on group dimensions
  const layoutGroups = (
    components: string[][], 
    groupDimensions: Array<{ width: number; height: number }>
  ) => {
    const positions: { x: number; y: number }[] = [];
    const padding = 300; // Minimum padding between groups
    
    // Calculate a reasonable number of columns based on number of groups
    let columns: number;
    if (components.length <= 2) {
      columns = components.length;
    } else if (components.length <= 4) {
      columns = 2;
    } else {
      columns = Math.min(3, Math.ceil(Math.sqrt(components.length)));
    }
    
    // Initialize rows with empty arrays
    const rows: number[][] = Array(Math.ceil(components.length / columns))
      .fill(null)
      .map(() => []);
    
    // Assign groups to rows
    for (let i = 0; i < components.length; i++) {
      const rowIndex = Math.floor(i / columns);
      rows[rowIndex].push(i);
    }
    
    // Calculate vertical positions for each row
    let currentY = 0;
    const rowPositions: number[] = [];
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      rowPositions.push(currentY);
      
      // Find the tallest group in this row to determine next row's Y position
      let maxHeightInRow = 0;
      for (const groupIndex of rows[rowIndex]) {
        maxHeightInRow = Math.max(maxHeightInRow, groupDimensions[groupIndex].height);
      }
      
      currentY += maxHeightInRow + padding;
    }
    
    // Calculate horizontal positions for each group
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      // Start position for this row
      let currentX = 0;
      
      for (let i = 0; i < row.length; i++) {
        const groupIndex = row[i];
        positions[groupIndex] = {
          x: currentX,
          y: rowPositions[rowIndex]
        };
        
        currentX += groupDimensions[groupIndex].width + padding;
      }
    }
    
    return positions;
  };
  
  // Layout for isolated tables in a grid
  const layoutIsolatedTables = (
    tables: string[], 
    tableDimensions: Map<string, { width: number; height: number }>,
    groupWidth: number
  ) => {
    const positions: { [key: string]: { x: number; y: number } } = {};
    const padding = 50; // Padding between tables
    
    // Calculate how many tables we can fit per row
    const avgTableWidth = 250; // Average table width including padding
    const columns = Math.max(1, Math.floor((groupWidth - padding) / (avgTableWidth + padding)));
    
    // Distribute tables in a grid
    tables.forEach((table, index) => {
      const dimensions = tableDimensions.get(table) || { width: 220, height: 150 };
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      // Add padding for grid layout
      const x = col * (avgTableWidth + padding) + padding;
      const y = row * (dimensions.height + padding) + padding;
      
      positions[table] = { x, y };
    });
    
    return positions;
  };
  
  // Layout tables within a group using strategies based on group size
  const layoutTablesInGroup = (
    tables: string[], 
    schema: TableSchema[],
    tableDimensions: Map<string, { width: number; height: number }>,
    groupWidth: number,
    groupHeight: number
  ) => {
    const positions: { [key: string]: { x: number; y: number } } = {};
    const padding = 80; // Padding between tables
    
    if (tables.length === 1) {
      // Single table centered in group
      positions[tables[0]] = { 
        x: (groupWidth - (tableDimensions.get(tables[0])?.width || 220)) / 2, 
        y: (groupHeight - (tableDimensions.get(tables[0])?.height || 150)) / 2 
      };
      return positions;
    }
    
    // For small groups (2-8 tables), use a circular layout
    if (tables.length <= 8) {
      const centerX = groupWidth / 2;
      const centerY = groupHeight / 2;
      const radius = Math.min(groupWidth, groupHeight) / 2.5;
      
      const angleStep = (2 * Math.PI) / tables.length;
      
      tables.forEach((table, index) => {
        const angle = index * angleStep;
        const dimensions = tableDimensions.get(table) || { width: 220, height: 150 };
        
        positions[table] = {
          x: centerX + radius * Math.cos(angle) - dimensions.width / 2,
          y: centerY + radius * Math.sin(angle) - dimensions.height / 2
        };
      });
      
      return positions;
    }
    
    // For medium to large groups, use a grid layout
    const avgTableWidth = 250; // Average table width including padding
    const avgTableHeight = 200; // Average table height including padding
    
    // Calculate optimal grid dimensions
    const gridColumns = Math.ceil(Math.sqrt(tables.length * (avgTableWidth / avgTableHeight)));
    const gridRows = Math.ceil(tables.length / gridColumns);
    
    // Try to fill the group area efficiently
    const cellWidth = (groupWidth - (padding * 2)) / gridColumns;
    const cellHeight = (groupHeight - (padding * 2)) / gridRows;
    
    tables.forEach((table, index) => {
      const dimensions = tableDimensions.get(table) || { width: 220, height: 150 };
      const row = Math.floor(index / gridColumns);
      const col = index % gridColumns;
      
      // Center the table in its cell
      const x = padding + (col * cellWidth) + ((cellWidth - dimensions.width) / 2);
      const y = padding + (row * cellHeight) + ((cellHeight - dimensions.height) / 2);
      
      positions[table] = { x, y };
    });
    
    return positions;
  };

  // Handle diagram refresh - force a fresh fetch by clearing cache
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First clear the cached schema
      await window.database.clearSchemaCache(connectionId);
      
      // Then fetch a fresh schema
      const schemaData = await window.database.getDatabaseSchema(connectionId, true);
      setSchema(schemaData);
      createGraphElements(schemaData);
    } catch (err) {
      console.error('Failed to refresh database schema:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh database schema');
    } finally {
      setLoading(false);
    }
  };

  if (loading && schema.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading database schema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md p-6 bg-destructive/10 border border-destructive/20 rounded-md dark:bg-destructive/20">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error loading schema</h3>
          <p className="text-destructive/90 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (schema.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md p-6 bg-background border rounded-md">
          <h3 className="text-xl font-semibold mb-3">No Tables Found</h3>
          <p className="text-muted-foreground mb-4">
            This database doesn't appear to have any tables or they couldn't be loaded.
          </p>
          <Button onClick={handleRefresh}>
            Refresh Schema
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView={!viewportSet}
        onInit={() => setViewportSet(true)}
        minZoom={0.05}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-right" className="bg-background border rounded-md shadow-sm p-2">
          <Button 
            onClick={handleRefresh} 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-1"
            disabled={loading}
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            Refresh Schema
          </Button>
        </Panel>
        <Controls />
        <MiniMap nodeBorderRadius={2} />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
};

// Helper function to find connected components (groups of related tables)
const findConnectedComponents = (schema: TableSchema[]): string[][] => {
  // Build an adjacency list of relationships
  const adjacencyList = new Map<string, Set<string>>();
  
  // Initialize all tables
  for (const table of schema) {
    adjacencyList.set(table.name, new Set<string>());
  }
  
  // Add relationships from foreign keys
  for (const table of schema) {
    for (const fk of table.foreignKeys) {
      // Add bidirectional relationship
      adjacencyList.get(table.name)?.add(fk.referencedTable);
      if (adjacencyList.has(fk.referencedTable)) {
        adjacencyList.get(fk.referencedTable)?.add(table.name);
      }
    }
  }
  
  // DFS to find connected components
  const visited = new Set<string>();
  const components: string[][] = [];
  
  const dfs = (node: string, component: string[]) => {
    visited.add(node);
    component.push(node);
    
    for (const neighbor of adjacencyList.get(node) || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    }
  };
  
  // Find all connected components
  for (const node of adjacencyList.keys()) {
    if (!visited.has(node)) {
      const component: string[] = [];
      dfs(node, component);
      components.push(component);
    }
  }
  
  return components;
};

export default ERDiagram; 
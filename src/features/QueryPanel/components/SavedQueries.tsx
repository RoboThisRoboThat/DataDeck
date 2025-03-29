import Sidebar from "./Sidebar";

interface SavedQuery {
	name: string;
	sql: string;
	createdAt: string;
	description?: string;
}

interface SavedQueriesProps {
	connectionId: string;
	onSelectQuery: (sql: string, name: string) => void;
	onDeleteQuery: (name: string) => void;
	currentQueryName: string | null;
	queries: SavedQuery[];
	loading: boolean;
	error: string | null;
	onRefetchQueries: () => void;
}

/**
 * @deprecated Use Sidebar component instead. This component is kept for backwards compatibility.
 */
const SavedQueries = (props: SavedQueriesProps) => {
	// Just forward props to the Sidebar component
	return <Sidebar {...props} />;
};

export default SavedQueries;

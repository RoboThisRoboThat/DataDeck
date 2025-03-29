import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiDatabase, FiZap } from "react-icons/fi";
import SavedQueriesList from "./SavedQueriesList";
import AIQueries from "./AIQueries";

interface SavedQuery {
	name: string;
	sql: string;
	createdAt: string;
	description?: string;
}

interface SidebarProps {
	connectionId: string;
	onSelectQuery: (sql: string, name: string) => void;
	onDeleteQuery: (name: string) => void;
	currentQueryName: string | null;
	queries: SavedQuery[];
	loading: boolean;
	error: string | null;
	onRefetchQueries: () => void;
}

const Sidebar = ({
	connectionId,
	onSelectQuery,
	onDeleteQuery,
	currentQueryName,
	queries,
	loading,
	error,
	onRefetchQueries,
}: SidebarProps) => {
	return (
		<div className="flex flex-col h-screen">
			<div className="p-4 border-b border-gray-200 flex-shrink-0">
				<h6 className="text-gray-800 mb-3 font-medium">Queries Sidebar</h6>
			</div>

			<div className="flex-1 overflow-y-auto">
				<div className="p-4 pt-2">
					<Tabs defaultValue="saved" className="w-full gap-1">
						<TabsList className="h-12 sticky top-0 bg-white z-10">
							<TabsTrigger value="saved">
								<div className="flex items-center justify-center gap-1.5">
									<FiDatabase size={16} />
									<span>Saved Queries</span>
								</div>
							</TabsTrigger>
							<TabsTrigger value="ai">
								<div className="flex items-center justify-center gap-1.5">
									<FiZap size={16} />
									<span>AI</span>
								</div>
							</TabsTrigger>
						</TabsList>
						<TabsContent
							value="saved"
							className="mt-2 border rounded-md shadow-sm"
						>
							<SavedQueriesList
								connectionId={connectionId}
								onSelectQuery={onSelectQuery}
								onDeleteQuery={onDeleteQuery}
								currentQueryName={currentQueryName}
								queries={queries}
								loading={loading}
								error={error}
								onRefetchQueries={onRefetchQueries}
							/>
						</TabsContent>
						<TabsContent
							value="ai"
							className="mt-2 border rounded-md shadow-sm"
						>
							<AIQueries />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
};

export default Sidebar;

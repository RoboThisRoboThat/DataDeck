import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServerInfo } from "../types";

interface ServerMonitorProps {
	serverInfo: ServerInfo | null;
	isLoading: boolean;
	onRefresh: () => void;
}

/**
 * Displays Redis server information and statistics
 */
export function ServerMonitor({
	serverInfo,
	isLoading,
	onRefresh,
}: ServerMonitorProps) {
	if (!serverInfo) {
		return (
			<Card className="h-full flex items-center justify-center">
				<CardContent className="text-center text-muted-foreground">
					{isLoading ? "Loading server info..." : "No server info available"}
				</CardContent>
			</Card>
		);
	}

	// Extract key sections
	const sections = [
		{ key: "server", title: "Server" },
		{ key: "clients", title: "Clients" },
		{ key: "memory", title: "Memory" },
		{ key: "stats", title: "Stats" },
		{ key: "replication", title: "Replication" },
		{ key: "keyspace", title: "Keyspace" },
	];

	return (
		<div className="h-full overflow-auto">
			<div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
				<h2 className="text-lg font-semibold">Server Information</h2>
				<Button variant="outline" size="sm" onClick={onRefresh}>
					<RefreshCw className="h-4 w-4 mr-1" />
					Refresh
				</Button>
			</div>

			<div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{sections.map(({ key, title }) => {
					const section = serverInfo[key];
					if (!section || Object.keys(section).length === 0) return null;

					return (
						<Card key={key}>
							<CardHeader className="py-3">
								<CardTitle className="text-sm font-medium">{title}</CardTitle>
							</CardHeader>
							<CardContent className="py-0 pb-3">
								<dl className="space-y-1 text-sm">
									{Object.entries(section).slice(0, 10).map(([k, v]) => (
										<div key={k} className="flex justify-between">
											<dt className="text-muted-foreground truncate max-w-[50%]">
												{k}
											</dt>
											<dd className="font-mono text-right truncate max-w-[45%]">
												{String(v)}
											</dd>
										</div>
									))}
									{Object.keys(section).length > 10 && (
										<div className="text-muted-foreground text-xs pt-1">
											+{Object.keys(section).length - 10} more
										</div>
									)}
								</dl>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

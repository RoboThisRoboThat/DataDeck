import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ConnectionStatusProps {
	isConnecting: boolean;
	connectionError: string | null;
	connectionName: string;
	onRetry: () => void;
}

/**
 * Displays connection status - loading, error, or nothing if connected
 */
export function ConnectionStatus({
	isConnecting,
	connectionError,
	connectionName,
	onRetry,
}: ConnectionStatusProps) {
	if (isConnecting) {
		return (
			<div className="h-full flex items-center justify-center">
				<Card className="w-96">
					<CardContent className="pt-6 text-center">
						<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
						<h3 className="text-lg font-medium mb-2">Connecting to Redis</h3>
						<p className="text-muted-foreground">{connectionName}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (connectionError) {
		return (
			<div className="h-full flex items-center justify-center">
				<Card className="w-96">
					<CardContent className="pt-6 text-center">
						<AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
						<h3 className="text-lg font-medium mb-2">Connection Error</h3>
						<p className="text-muted-foreground mb-4">{connectionError}</p>
						<Button onClick={onRetry}>Retry Connection</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return null;
}

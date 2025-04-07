import { useScreen } from "../context/ScreenContext";
import { ConnectionScreen } from "../screens/ConnectionScreen";
import { TablesScreen } from "../screens/TablesScreen";
import { RedisScreen } from "../screens/RedisScreen";

export function AppContent() {
	const { currentScreen } = useScreen();

	switch (currentScreen) {
		case "connection":
			return <ConnectionScreen />;
		case "tables":
			return <TablesScreen />;
		case "redis":
			return <RedisScreen />;
		default:
			return <ConnectionScreen />;
	}
}

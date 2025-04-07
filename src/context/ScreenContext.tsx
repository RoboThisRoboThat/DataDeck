import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

type Screen = "connection" | "tables" | "query" | "redis";

interface ScreenContextType {
	currentScreen: Screen;
	setCurrentScreen: (screen: Screen) => void;
	activeConnectionId: string | null;
	setActiveConnectionId: (id: string | null) => void;
	activeConnectionName: string | null;
	setActiveConnectionName: (name: string | null) => void;
	activeConnectionType: string | null;
	setActiveConnectionType: (type: string | null) => void;
}

const ScreenContext = createContext<ScreenContextType | undefined>(undefined);

export function ScreenProvider({ children }: { children: ReactNode }) {
	const [currentScreen, setCurrentScreen] = useState<Screen>("connection");
	const [activeConnectionId, setActiveConnectionId] = useState<string | null>(
		null,
	);
	const [activeConnectionName, setActiveConnectionName] = useState<
		string | null
	>(null);
	const [activeConnectionType, setActiveConnectionType] = useState<
		string | null
	>(null);

	useEffect(() => {
		if (!activeConnectionId || !activeConnectionName) {
			const urlParams = new URLSearchParams(window.location.search);
			const connId = urlParams.get("connectionId");
			const connName = urlParams.get("connectionName");
			const connType = urlParams.get("connectionType");

			if (connId) {
				setActiveConnectionId(connId);
			}
			if (connName) {
				setActiveConnectionName(connName);
			}
			if (connType) {
				setActiveConnectionType(connType);
			}
		}
	}, [activeConnectionId, activeConnectionName]);

	useEffect(() => {
		// Only automatically navigate to tables screen if we're not on the redis screen
		// and the connection is not a redis connection
		if (
			activeConnectionId &&
			activeConnectionName &&
			currentScreen === "connection" &&
			activeConnectionType !== "redis"
		) {
			setCurrentScreen("tables");
		}
	}, [
		activeConnectionId,
		activeConnectionName,
		currentScreen,
		activeConnectionType,
	]);

	return (
		<ScreenContext.Provider
			value={{
				currentScreen,
				setCurrentScreen,
				activeConnectionId,
				setActiveConnectionId,
				activeConnectionName,
				setActiveConnectionName,
				activeConnectionType,
				setActiveConnectionType,
			}}
		>
			{children}
		</ScreenContext.Provider>
	);
}

export function useScreen() {
	const context = useContext(ScreenContext);
	if (context === undefined) {
		throw new Error("useScreen must be used within a ScreenProvider");
	}
	return context;
}

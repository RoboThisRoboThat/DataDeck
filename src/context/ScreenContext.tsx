import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

type Screen = "connection" | "tables" | "query";

interface ScreenContextType {
	currentScreen: Screen;
	setCurrentScreen: (screen: Screen) => void;
	activeConnectionId: string | null;
	setActiveConnectionId: (id: string | null) => void;
	activeConnectionName: string | null;
	setActiveConnectionName: (name: string | null) => void;
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

	useEffect(() => {
		if (!activeConnectionId || !activeConnectionName) {
			const urlParams = new URLSearchParams(window.location.search);
			const connId = urlParams.get("connectionId");
			const connName = urlParams.get("connectionName");
			if (connId) {
				setActiveConnectionId(connId);
			}
			if (connName) {
				setActiveConnectionName(connName);
			}
		}
	}, [activeConnectionId, activeConnectionName]);

	useEffect(() => {
		if (
			activeConnectionId &&
			activeConnectionName &&
			currentScreen === "connection"
		) {
			setCurrentScreen("tables");
		}
	}, [activeConnectionId, activeConnectionName, currentScreen]);

	return (
		<ScreenContext.Provider
			value={{
				currentScreen,
				setCurrentScreen,
				activeConnectionId,
				setActiveConnectionId,
				activeConnectionName,
				setActiveConnectionName,
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

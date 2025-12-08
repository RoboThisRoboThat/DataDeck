import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ErrorState {
	title?: string;
	message: string;
	details?: string;
}

interface ErrorContextType {
	error: ErrorState | null;
	showError: (error: ErrorState | string) => void;
	clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
	const [error, setError] = useState<ErrorState | null>(null);

	const showError = useCallback((err: ErrorState | string) => {
		if (typeof err === "string") {
			setError({ message: err });
		} else {
			setError(err);
		}
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return (
		<ErrorContext.Provider value={{ error, showError, clearError }}>
			{children}
		</ErrorContext.Provider>
	);
}

export function useError() {
	const context = useContext(ErrorContext);
	if (context === undefined) {
		throw new Error("useError must be used within an ErrorProvider");
	}
	return context;
}

